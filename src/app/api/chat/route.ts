
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { inventoryChat, InventoryChatInput, InventoryChatOutput, ChatContext } from '@/ai/flows/inventoryChat';
import type { InventoryStockDocument, ChatSessionDocument, ChatMessage as FirestoreChatMessage, OrderDocument, SupplierDocument } from '@/lib/types/firestore';
import { z } from 'zod';

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
  // inventoryDataOverride is removed as context is now built server-side
});

export async function POST(request: NextRequest) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { message: userQuery, sessionId: existingSessionId } = validationResult.data;
    let currentSessionId = existingSessionId;
    let conversationHistory: FirestoreChatMessage[] = [];

    // --- Fetch Comprehensive Context ---
    const chatContextData: ChatContext = {};

    // 1. Inventory Summary & Low Stock
    const inventorySnapshot = await db.collection('inventory')
                                      .where('companyId', '==', companyId)
                                      .get();
    let totalItems = 0;
    let totalValue = 0;
    const lowStockItems: ChatContext['lowStockItems'] = [];
    inventorySnapshot.docs.forEach(doc => {
      const item = doc.data() as InventoryStockDocument;
      totalItems++;
      totalValue += (item.quantity || 0) * (item.unitCost || 0);
      if (item.reorderPoint > 0 && (item.quantity || 0) <= item.reorderPoint) {
        lowStockItems.push({ sku: item.sku, name: item.name, quantity: item.quantity, reorderPoint: item.reorderPoint });
      }
    });
    chatContextData.inventorySummary = { totalItems, totalValue };
    if (lowStockItems.length > 0) {
      chatContextData.lowStockItems = lowStockItems;
    }

    // 2. Recent Orders Summary (last 30 days, purchase orders)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrdersSnapshot = await db.collection('orders')
      .where('companyId', '==', companyId)
      .where('type', '==', 'purchase')
      .where('orderDate', '>=', AdminTimestamp.fromDate(thirtyDaysAgo))
      .get();

    let pendingPurchaseOrders = 0;
    let awaitingDeliveryPurchaseOrders = 0;
    recentOrdersSnapshot.docs.forEach(doc => {
        const order = doc.data() as OrderDocument;
        if (order.status === 'pending' || order.status === 'pending_approval') pendingPurchaseOrders++;
        if (order.status === 'awaiting_delivery' || order.status === 'shipped') awaitingDeliveryPurchaseOrders++;
    });
    chatContextData.recentOrdersSummary = { pendingPurchaseOrders, awaitingDeliveryPurchaseOrders };

    // 3. Top Suppliers (Top 3 by reliability score, or just recent if no scores)
    const suppliersSnapshot = await db.collection('suppliers')
                                     .where('companyId', '==', companyId)
                                     .orderBy('reliabilityScore', 'desc') // Order by score if available
                                     .limit(5) // Limit to a few top/recent suppliers
                                     .get();
    chatContextData.topSuppliers = suppliersSnapshot.docs.map(doc => {
        const sup = doc.data() as SupplierDocument;
        return { id: sup.id, name: sup.name, reliabilityScore: sup.reliabilityScore };
    });
    
    // 4. Sales Trends Summary (Simplified for now)
    chatContextData.salesTrendsSummary = "Sales data is available. Ask about specific products or overall performance for more detailed insights. For example, 'How has SKU001 sold recently?' or 'What are my best selling items?'.";

    // --- Chat History and Session Management ---
    if (currentSessionId) {
      const sessionDocSnap = await db.collection('chat_sessions').doc(currentSessionId).get();
      if (sessionDocSnap.exists) {
        const sessionData = sessionDocSnap.data() as ChatSessionDocument;
        if (sessionData.companyId === companyId && sessionData.userId === userId) {
          conversationHistory = sessionData.messages.map(msg => ({
            ...msg,
            timestamp: (msg.timestamp as AdminTimestamp).toDate() // Ensure JS Date for history
          }));
        } else {
          // Session belongs to another user/company, treat as new
          currentSessionId = undefined;
          conversationHistory = [];
        }
      } else {
        currentSessionId = undefined; // Session not found
      }
    }
    
    const chatInput: InventoryChatInput = {
      query: userQuery,
      chatContext: chatContextData,
      conversationHistory: conversationHistory.map(msg => ({ role: msg.role, content: msg.content })), // For AI, content only
    };

    const aiResult: InventoryChatOutput = await inventoryChat(chatInput);

    const userMessageEntry: FirestoreChatMessage = { role: 'user', content: userQuery, timestamp: FieldValue.serverTimestamp() };
    const assistantMessageEntry: FirestoreChatMessage = { role: 'assistant', content: aiResult.answer, timestamp: FieldValue.serverTimestamp() };

    const contextSnapshotString = JSON.stringify(chatContextData);

    if (currentSessionId) {
      const sessionRef = db.collection('chat_sessions').doc(currentSessionId);
      await sessionRef.update({
        messages: FieldValue.arrayUnion(userMessageEntry, assistantMessageEntry),
        lastMessageAt: FieldValue.serverTimestamp(),
        contextSnapshot, // Update with the latest context for this turn
      });
    } else {
      const newSessionRef = db.collection('chat_sessions').doc();
      const sessionTitle = userQuery.substring(0, 50) + (userQuery.length > 50 ? '...' : '');
      await newSessionRef.set({
        companyId,
        userId,
        messages: [userMessageEntry, assistantMessageEntry],
        createdAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        contextSnapshot: contextSnapshotString,
        title: sessionTitle,
      });
      currentSessionId = newSessionRef.id;
    }

    return NextResponse.json({ 
        data: { 
            ...aiResult, // Includes answer, data, suggestedActions, confidence
            sessionId: currentSessionId 
        } 
    });

  } catch (error: any) {
    console.error('Error processing chat message:', error);
    const message = error.message || 'Failed to process chat message.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


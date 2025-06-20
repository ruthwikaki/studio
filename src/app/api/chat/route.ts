
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
  inventoryDataOverride: z.string().optional().describe("A JSON string of inventory data to use instead of fetching from Firestore. Useful for 'what-if' or temporary context."),
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

    const { message: userQuery, sessionId: existingSessionId, inventoryDataOverride } = validationResult.data;
    let currentSessionId = existingSessionId;
    let conversationHistory: FirestoreChatMessage[] = [];

    // --- Build Chat Context ---
    const chatContextData: ChatContext = {};
    let contextSourceDescription = "Live Company Data";

    if (inventoryDataOverride) {
        try {
            const overrideData = JSON.parse(inventoryDataOverride) as Partial<InventoryStockDocument>[];
            // Build summary and low stock from override data
            chatContextData.inventorySummary = {
                totalItems: overrideData.length,
                totalValue: overrideData.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0), 0),
            };
            chatContextData.lowStockItems = overrideData
                .filter(item => item.reorderPoint && item.reorderPoint > 0 && (item.quantity || 0) <= item.reorderPoint)
                .map(item => ({ sku: item.sku!, name: item.name!, quantity: item.quantity!, reorderPoint: item.reorderPoint! }));
            contextSourceDescription = "Provided Data Override";
        } catch (e) {
            console.error("Error parsing inventoryDataOverride:", e);
            return NextResponse.json({ error: 'Invalid inventoryDataOverride JSON format.' }, { status: 400 });
        }
    } else {
        // Fetch live inventory data if no override
        const inventorySnapshot = await db.collection('inventory')
                                          .where('companyId', '==', companyId)
                                          .get();
        let totalItems = 0;
        let totalValue = 0;
        const lowStockItems: NonNullable<ChatContext['lowStockItems']> = [];
        inventorySnapshot.docs.forEach(doc => {
          const item = doc.data() as InventoryStockDocument;
          totalItems++;
          totalValue += (item.quantity || 0) * (item.unitCost || 0);
          if (item.reorderPoint && item.reorderPoint > 0 && (item.quantity || 0) <= item.reorderPoint) {
            lowStockItems.push({ sku: item.sku, name: item.name, quantity: item.quantity, reorderPoint: item.reorderPoint });
          }
        });
        chatContextData.inventorySummary = { totalItems, totalValue };
        if (lowStockItems.length > 0) chatContextData.lowStockItems = lowStockItems;
    }

    // Fetch other context regardless of override (orders, suppliers, sales trends)
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

    const suppliersSnapshot = await db.collection('suppliers')
                                     .where('companyId', '==', companyId)
                                     .orderBy('reliabilityScore', 'desc') 
                                     .limit(5) 
                                     .get();
    chatContextData.topSuppliers = suppliersSnapshot.docs.map(doc => {
        const sup = doc.data() as SupplierDocument;
        return { id: sup.id, name: sup.name, reliabilityScore: sup.reliabilityScore };
    });
    
    chatContextData.salesTrendsSummary = `Sales trends based on ${contextSourceDescription}. Ask about specific products or overall performance.`;

    // --- Chat History and Session Management ---
    if (currentSessionId) {
      const sessionDocSnap = await db.collection('chat_sessions').doc(currentSessionId).get();
      if (sessionDocSnap.exists) {
        const sessionData = sessionDocSnap.data() as ChatSessionDocument;
        if (sessionData.companyId === companyId && sessionData.userId === userId) {
          conversationHistory = sessionData.messages.map(msg => ({
            ...msg,
            timestamp: (msg.timestamp as AdminTimestamp).toDate() 
          }));
        } else {
          currentSessionId = undefined;
          conversationHistory = [];
        }
      } else {
        currentSessionId = undefined; 
      }
    }
    
    const chatInput: InventoryChatInput = {
      query: userQuery,
      chatContext: chatContextData,
      conversationHistory: conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
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
        contextSnapshot: contextSnapshotString, // Update with the latest context for this turn
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
            answer: aiResult.answer,
            data: aiResult.data,
            suggestedActions: aiResult.suggestedActions,
            confidence: aiResult.confidence,
            sessionId: currentSessionId 
        } 
    });

  } catch (error: any)
{
    console.error('Error processing chat message:', error);
    const message = error.message || 'Failed to process chat message.';
    // If it's a ZodError from parsing, provide more specific feedback
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload structure.', details: error.format() }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

    
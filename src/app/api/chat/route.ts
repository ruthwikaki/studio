
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// import { getFirestoreAdmin, FieldValue } from 'firebase-admin/firestore'; // Placeholder
// import { verifyAuthToken } from '@/lib/firebase/admin-auth'; // Placeholder
import { inventoryChat, InventoryChatInput, InventoryChatOutput } from '@/ai/flows/inventoryChat';
import type { InventoryItemDocument, ChatSessionDocument, ChatMessage as FirestoreChatMessage } from '@/lib/types/firestore';
import { z } from 'zod';

// Placeholder for Firestore instance
// const db = getFirestoreAdmin();

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(), // ID of an existing chat session
  inventoryDataOverride: z.string().optional().describe("Optional JSON string of inventory data to use instead of fetching from Firestore. Useful for 'Chat with uploaded file' scenarios."),
});

export async function POST(request: NextRequest) {
  // TODO: Implement Firebase Auth token verification
  // const { uid: userId } = await verifyAuthToken(request);
  // if (!userId) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  const userId = "mockUserId"; // Replace with actual uid

  try {
    const body = await request.json();
    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { message: userQuery, sessionId: existingSessionId, inventoryDataOverride } = validationResult.data;
    let currentSessionId = existingSessionId;
    let conversationHistory: FirestoreChatMessage[] = [];
    let inventoryDataJson: string;

    if (inventoryDataOverride) {
        inventoryDataJson = inventoryDataOverride;
    } else {
        // Fetch all inventory items for the user to provide as context
        // In a real app, consider summarizing or sampling for very large inventories
        // const inventorySnapshot = await db.collection('inventory').where('userId', '==', userId).get();
        // const items: InventoryItemDocument[] = inventorySnapshot.docs.map(doc => doc.data() as InventoryItemDocument);
        // inventoryDataJson = JSON.stringify(items.map(({userId, ...rest}) => rest)); // Remove userId before sending to AI
        
        // Mocked inventory for now if not overridden
        const MOCK_ITEMS_FOR_CHAT = [
            { sku: "SKU001", name: "Blue T-Shirt", quantity: 100, unitCost: 10, reorderPoint: 20, category: "Apparel" },
            { sku: "SKU002", name: "Red Scarf", quantity: 10, unitCost: 15, reorderPoint: 15, category: "Accessories" },
        ];
        inventoryDataJson = JSON.stringify(MOCK_ITEMS_FOR_CHAT);
    }


    // If sessionId is provided, fetch existing chat history
    if (currentSessionId) {
      // const sessionDoc = await db.collection('chatSessions').doc(currentSessionId).get();
      // if (sessionDoc.exists && sessionDoc.data()?.userId === userId) {
      //   conversationHistory = (sessionDoc.data() as ChatSessionDocument).messages;
      // } else {
      //   currentSessionId = undefined; // Session not found or not owned by user, start new
      // }
      // Mock: if session ID "known_session", provide some history
      if (currentSessionId === "known_session") {
        conversationHistory = [{ role: "user", content: "What's low?", timestamp: new Date(Date.now() - 60000) as any }];
      } else {
        currentSessionId = undefined; // Treat others as new for mock
      }
    }
    
    const chatInput: InventoryChatInput = {
      query: userQuery,
      inventoryData: inventoryDataJson,
      conversationHistory: conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
    };

    const aiResult: InventoryChatOutput = await inventoryChat(chatInput);

    const userMessageEntry: FirestoreChatMessage = { role: 'user', content: userQuery, timestamp: new Date() as any /* FieldValue.serverTimestamp() */ };
    const assistantMessageEntry: FirestoreChatMessage = { role: 'assistant', content: aiResult.response, timestamp: new Date() as any /* FieldValue.serverTimestamp() */ };

    // Store message in chatSessions collection
    // if (currentSessionId) {
    //   const sessionRef = db.collection('chatSessions').doc(currentSessionId);
    //   await sessionRef.update({
    //     messages: FieldValue.arrayUnion(userMessageEntry, assistantMessageEntry),
    //     lastMessageAt: FieldValue.serverTimestamp(),
    //   });
    // } else {
    //   const newSessionRef = db.collection('chatSessions').doc();
    //   await newSessionRef.set({
    //     userId,
    //     messages: [userMessageEntry, assistantMessageEntry],
    //     createdAt: FieldValue.serverTimestamp(),
    //     lastMessageAt: FieldValue.serverTimestamp(),
    //     context: { loadedInventoryDataSummary: inventoryDataOverride ? "Uploaded File" : "Firestore Data" },
    //   });
    //   currentSessionId = newSessionRef.id;
    // }
    if (!currentSessionId) currentSessionId = "new_mock_session_" + Date.now();


    return NextResponse.json({ 
        data: { 
            response: aiResult.response, 
            actionableInsights: aiResult.actionableInsights,
            sessionId: currentSessionId 
        } 
    });

  } catch (error) {
    console.error('Error processing chat message:', error);
    const message = error instanceof Error ? error.message : 'Failed to process chat message.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

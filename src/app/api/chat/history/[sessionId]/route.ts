
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { ChatSessionDocument, ChatMessage as FirestoreChatMessage } from '@/lib/types/firestore';

const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  const sessionId = params.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || `${DEFAULT_PAGE_SIZE}`);
  const lastTimestampStr = searchParams.get('lastTimestamp'); // For "load older" pagination cursor

  try {
    const sessionDocRef = db.collection('chat_sessions').doc(sessionId);
    const sessionDocSnap = await sessionDocRef.get();

    if (!sessionDocSnap.exists) {
      return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });
    }

    const sessionData = sessionDocSnap.data() as ChatSessionDocument;
    if (sessionData.companyId !== companyId || sessionData.userId !== userId) {
      return NextResponse.json({ error: 'Access denied to this chat session.' }, { status: 403 });
    }
    
    // Firestore array operations for pagination are limited.
    // For true pagination on messages array, it's often better to store messages in a subcollection.
    // Here, we'll do simple array slicing. Client can request older messages by sending the timestamp of the oldest message it has.
    // This is a simplified approach for demonstration.

    let messages = (sessionData.messages || []).map(msg => ({
      ...msg,
      timestamp: (msg.timestamp as AdminTimestamp).toDate().toISOString(), // Convert to ISO string
    }));

    // Sort messages by timestamp descending (newest first) for slicing, then reverse for display
    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let paginatedMessages = messages;
    let nextCursor: string | null = null;

    if (lastTimestampStr) {
        const lastTime = new Date(lastTimestampStr).getTime();
        const startIndex = messages.findIndex(msg => new Date(msg.timestamp).getTime() < lastTime);
        if (startIndex !== -1) {
            paginatedMessages = messages.slice(startIndex, startIndex + limit);
        } else {
            paginatedMessages = []; // No older messages
        }
    } else {
        paginatedMessages = messages.slice(0, limit);
    }

    if (paginatedMessages.length === limit && messages.length > paginatedMessages.length) {
        // Check if there are more messages beyond the current slice
        const potentialNextStartIndex = (lastTimestampStr ? messages.findIndex(msg => new Date(msg.timestamp).getTime() < new Date(lastTimestampStr).getTime()) : 0) + paginatedMessages.length;
        if (potentialNextStartIndex < messages.length) {
           nextCursor = paginatedMessages[paginatedMessages.length - 1]?.timestamp;
        }
    }
    
    // Reverse for chronological order (oldest first) in the returned array
    paginatedMessages.reverse();

    return NextResponse.json({ 
        data: {
            messages: paginatedMessages,
            sessionId: sessionId,
            title: sessionData.title,
            nextCursor: nextCursor, // Timestamp of the last message in this batch, to fetch older
        }
    });

  } catch (error: any) {
    console.error(`Error fetching chat history for session ${sessionId}:`, error);
    const message = error.message || 'Failed to fetch chat history.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

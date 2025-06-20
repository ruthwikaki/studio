
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { ChatSessionDocument, ChatMessage as FirestoreChatMessage } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  if (!isAdminInitialized()) {
    console.error("[API Chat History] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Chat History] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

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
  const lastTimestampStr = searchParams.get('lastTimestamp');

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
    
    let messages = (sessionData.messages || []).map(msg => ({
      ...msg,
      timestamp: (msg.timestamp as admin.firestore.Timestamp).toDate().toISOString(),
    }));

    messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let paginatedMessages = messages;
    let nextCursor: string | null = null;

    if (lastTimestampStr) {
        const lastTime = new Date(lastTimestampStr).getTime();
        const startIndex = messages.findIndex(msg => new Date(msg.timestamp).getTime() < lastTime);
        if (startIndex !== -1) {
            paginatedMessages = messages.slice(startIndex, startIndex + limit);
        } else {
            paginatedMessages = [];
        }
    } else {
        paginatedMessages = messages.slice(0, limit);
    }

    if (paginatedMessages.length === limit && messages.length > paginatedMessages.length) {
        const potentialNextStartIndex = (lastTimestampStr ? messages.findIndex(msg => new Date(msg.timestamp).getTime() < new Date(lastTimestampStr).getTime()) : 0) + paginatedMessages.length;
        if (potentialNextStartIndex < messages.length) {
           nextCursor = paginatedMessages[paginatedMessages.length - 1]?.timestamp;
        }
    }
    
    paginatedMessages.reverse();

    return NextResponse.json({ 
        data: {
            messages: paginatedMessages,
            sessionId: sessionId,
            title: sessionData.title,
            nextCursor: nextCursor,
        }
    });

  } catch (error: any) {
    console.error(`Error fetching chat history for session ${sessionId}:`, error);
    const message = error.message || 'Failed to fetch chat history.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

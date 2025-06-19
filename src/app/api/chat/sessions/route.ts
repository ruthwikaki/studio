
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { ChatSessionDocument } from '@/lib/types/firestore';

const DEFAULT_PAGE_SIZE = 15;

interface ChatSessionListItem {
  id: string;
  title?: string;
  lastMessageAt: string; // ISO string
  firstMessagePreview?: string;
}

export async function GET(request: NextRequest) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || `${DEFAULT_PAGE_SIZE}`);
  const startAfterDocId = searchParams.get('startAfterDocId'); // For cursor-based pagination

  try {
    let query = db.collection('chat_sessions')
                  .where('companyId', '==', companyId)
                  .where('userId', '==', userId)
                  .orderBy('lastMessageAt', 'desc')
                  .limit(limit);
    
    if (startAfterDocId) {
      const startAfterDoc = await db.collection('chat_sessions').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();
    
    const sessions: ChatSessionListItem[] = snapshot.docs.map(doc => {
      const data = doc.data() as ChatSessionDocument;
      const firstUserMessage = data.messages?.find(m => m.role === 'user')?.content;
      return {
        id: doc.id,
        title: data.title || (firstUserMessage ? firstUserMessage.substring(0, 50) + (firstUserMessage.length > 50 ? '...' : '') : "Untitled Chat"),
        lastMessageAt: (data.lastMessageAt as AdminTimestamp).toDate().toISOString(),
        firstMessagePreview: firstUserMessage ? firstUserMessage.substring(0, 100) + (firstUserMessage.length > 100 ? '...' : '') : "No messages yet.",
      };
    });

    let nextCursor: string | null = null;
    if (snapshot.docs.length === limit) {
      nextCursor = snapshot.docs[snapshot.docs.length - 1].id;
    }
    
    return NextResponse.json({ 
        data: sessions, 
        pagination: { 
            count: sessions.length,
            nextCursor: nextCursor 
        } 
    });

  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    const message = error.message || 'Failed to fetch chat sessions.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

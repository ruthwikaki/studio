
// src/app/api/notifications/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser } from '@/lib/firebase/admin-auth';
import type { NotificationDocument } from '@/lib/types/firestore';

const DEFAULT_PAGE_SIZE = 15;

// GET all notifications for the user (paginated)
export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  const { companyId, uid: userId } = user;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || `${DEFAULT_PAGE_SIZE}`);
  const startAfterDocId = searchParams.get('startAfterDocId'); // For cursor-based pagination
  const filterRead = searchParams.get('isRead'); // 'true', 'false', or undefined for all

  try {
    let query = db.collection('notifications')
                  .where('companyId', '==', companyId)
                  .where('userId', '==', userId)
                  .orderBy('createdAt', 'desc')
                  .limit(limit);
    
    if (filterRead === 'true') {
      query = query.where('isRead', '==', true);
    } else if (filterRead === 'false') {
      query = query.where('isRead', '==', false);
    }
    
    if (startAfterDocId) {
      const startAfterDoc = await db.collection('notifications').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();
    
    const notifications: NotificationDocument[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as FirebaseFirestore.Timestamp).toDate().toISOString(),
      } as NotificationDocument;
    });

    let nextCursor: string | null = null;
    if (snapshot.docs.length === limit) {
      nextCursor = snapshot.docs[snapshot.docs.length - 1].id;
    }
    
    return NextResponse.json({ 
        data: notifications, 
        pagination: { 
            count: notifications.length,
            nextCursor: nextCursor 
        } 
    });

  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    const message = error.message || 'Failed to fetch notifications.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

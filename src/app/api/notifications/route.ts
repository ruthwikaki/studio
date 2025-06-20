
// src/app/api/notifications/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser } from '@/lib/firebase/admin-auth';
import type { NotificationDocument } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const DEFAULT_PAGE_SIZE = 15;

export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API Notifications List] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Notifications List] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  const { companyId, uid: userId } = user;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || `${DEFAULT_PAGE_SIZE}`);
  const startAfterDocId = searchParams.get('startAfterDocId');
  const filterRead = searchParams.get('isRead');

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
        createdAt: (data.createdAt as admin.firestore.Timestamp).toDate().toISOString(),
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

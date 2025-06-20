
// src/app/api/notifications/mark-all-read/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, isAdminInitialized } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser } from '@/lib/firebase/admin-auth';

export const POST = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API Mark All Read] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Mark All Read] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  const { companyId, uid: userId } = user;

  try {
    const unreadNotificationsQuery = db.collection('notifications')
                                     .where('companyId', '==', companyId)
                                     .where('userId', '==', userId)
                                     .where('isRead', '==', false);
    
    const snapshot = await unreadNotificationsQuery.get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No unread notifications to mark as read.' });
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });

    await batch.commit();

    return NextResponse.json({ message: `${snapshot.size} notifications marked as read.` });

  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    const message = error.message || 'Failed to mark all notifications as read.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

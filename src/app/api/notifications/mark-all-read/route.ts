
// src/app/api/notifications/mark-all-read/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser } from '@/lib/firebase/admin-auth';

// POST to mark all notifications for the user as read
export const POST = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
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

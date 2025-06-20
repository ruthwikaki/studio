
// src/app/api/notifications/[id]/read/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, isAdminInitialized } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { NotificationDocument } from '@/lib/types/firestore';

export const PUT = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API Notif Read] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Notif Read] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  const { companyId, uid: userId } = user;
  const notificationId = params.id;

  if (!notificationId) {
    return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
  }

  try {
    const notificationRef = db.collection('notifications').doc(notificationId);
    const docSnap = await notificationRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }

    const notificationData = docSnap.data() as NotificationDocument;
    if (notificationData.companyId !== companyId || notificationData.userId !== userId) {
      return NextResponse.json({ error: 'Access denied to this notification.' }, { status: 403 });
    }

    if (notificationData.isRead) {
      return NextResponse.json({ message: 'Notification already marked as read.', data: notificationData });
    }

    await notificationRef.update({ isRead: true });

    return NextResponse.json({ message: 'Notification marked as read successfully.' });

  } catch (error: any) {
    console.error(`Error marking notification ${notificationId} as read:`, error);
    const message = error.message || 'Failed to mark notification as read.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

// src/app/api/activity-logs/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized, FieldValue } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { ActivityLogDocument, ActivityActionType } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const DEFAULT_PAGE_SIZE = 25;

// GET activity logs (paginated, filterable) - Requires 'manager' role or higher
export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  if (!requireRole(user.role, 'manager')) {
      return NextResponse.json({ error: 'Access denied. Requires manager role or higher.' }, { status: 403 });
  }
  
  if (!isAdminInitialized()) {
    console.error("[API Activity Logs] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Activity Logs] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }
  
  const { companyId } = user;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || `${DEFAULT_PAGE_SIZE}`);
  const startAfterDocId = searchParams.get('startAfterDocId');
  const filterUserId = searchParams.get('userId');
  const filterActionType = searchParams.get('actionType') as ActivityActionType | null;
  const filterResourceType = searchParams.get('resourceType');
  const dateFrom = searchParams.get('dateFrom'); // ISO string
  const dateTo = searchParams.get('dateTo');     // ISO string

  try {
    let query: FirebaseFirestore.Query = db.collection('activity_logs')
                               .where('companyId', '==', companyId);
    
    if (filterUserId) query = query.where('userId', '==', filterUserId);
    if (filterActionType) query = query.where('actionType', '==', filterActionType);
    if (filterResourceType) query = query.where('resourceType', '==', filterResourceType);
    if (dateFrom) query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(new Date(dateFrom)));
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23,59,59,999); // include whole day
        query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(toDate));
    }
    
    query = query.orderBy('timestamp', 'desc').limit(limit);
    
    if (startAfterDocId) {
      const startAfterDoc = await db.collection('activity_logs').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();
    
    const logs: ActivityLogDocument[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as admin.firestore.Timestamp).toDate().toISOString(),
      } as ActivityLogDocument;
    });

    let nextCursor: string | null = null;
    if (snapshot.docs.length === limit) {
      nextCursor = snapshot.docs[snapshot.docs.length - 1].id;
    }
    
    return NextResponse.json({ 
        data: logs, 
        pagination: { 
            count: logs.length,
            nextCursor: nextCursor 
        } 
    });

  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
     if (error.code === 'failed-precondition') {
      return NextResponse.json({ 
        error: 'Query requires an index. Please create the necessary composite index in Firestore for activity logs.',
        details: error.message
      }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch activity logs.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

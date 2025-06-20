
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { OrderDocument, OrderStatus } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API Orders List] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Orders List] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  if (!requireRole(user.role, 'viewer')) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }
  const { companyId } = user;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const startAfterDocId = searchParams.get('startAfter');
  const status = searchParams.get('status') as OrderStatus | null;
  const type = searchParams.get('type') as 'purchase' | 'sales' | 'transfer' | null;
  const supplierId = searchParams.get('supplierId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const fieldsParam = searchParams.get('fields');

  try {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('orders')
                                                                    .where('companyId', '==', companyId)
                                                                    .where('deletedAt', '==', null);

    if (status) query = query.where('status', '==', status);
    if (type) query = query.where('type', '==', type);
    if (supplierId) query = query.where('supplierId', '==', supplierId);
    
    if (dateFrom && dateTo) {
        const from = admin.firestore.Timestamp.fromDate(new Date(dateFrom));
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        const to = admin.firestore.Timestamp.fromDate(toDate);
        query = query.where('orderDate', '>=', from).where('orderDate', '<=', to);
    } else if (dateFrom) {
        query = query.where('orderDate', '>=', admin.firestore.Timestamp.fromDate(new Date(dateFrom)));
    } else if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query = query.where('orderDate', '<=', admin.firestore.Timestamp.fromDate(toDate));
    }
    
    query = query.orderBy('orderDate', 'desc');

    if (startAfterDocId) {
      const startAfterDoc = await db.collection('orders').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    const snapshot = await query.limit(limit).get();
    
    let selectedFields: string[] | null = null;
    if (fieldsParam) {
        selectedFields = fieldsParam.split(',').map(f => f.trim()).filter(Boolean);
        selectedFields = Array.from(new Set(['id', 'orderNumber', 'status', 'type', 'orderDate', 'totalAmount', ...selectedFields]));
    }

    const orders = snapshot.docs.map(doc => {
      const data = doc.data() as OrderDocument; // Cast to OrderDocument for type safety
      const baseData = {
        id: doc.id,
        orderNumber: data.orderNumber,
        type: data.type,
        status: data.status,
        totalAmount: data.totalAmount,
        orderDate: (data.orderDate as admin.firestore.Timestamp)?.toDate().toISOString(),
        expectedDate: (data.expectedDate as admin.firestore.Timestamp)?.toDate()?.toISOString() || null,
        actualDeliveryDate: (data.actualDeliveryDate as admin.firestore.Timestamp)?.toDate()?.toISOString() || null,
        supplierId: data.supplierId,
      };

      if (selectedFields) {
        const filteredData: Partial<OrderDocument> & { id: string } = { id: doc.id };
        selectedFields.forEach(field => {
          if (field === 'id') return;
          if ((baseData as any)[field] !== undefined) {
             (filteredData as any)[field] = (baseData as any)[field];
          } else if ((data as any)[field] !== undefined) {
            const val = (data as any)[field];
            if (val instanceof admin.firestore.Timestamp) {
                (filteredData as any)[field] = val.toDate().toISOString();
            } else {
                (filteredData as any)[field] = val;
            }
          }
        });
        return filteredData;
      }
      // Return full data with converted timestamps if no specific fields
      return {
        ...data, // spread original data
        id: doc.id, // ensure id is present
        orderDate: (data.orderDate as admin.firestore.Timestamp)?.toDate().toISOString(),
        createdAt: (data.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        lastUpdated: (data.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
        expectedDate: data.expectedDate ? (data.expectedDate as admin.firestore.Timestamp).toDate().toISOString() : undefined,
        actualDeliveryDate: data.actualDeliveryDate ? (data.actualDeliveryDate as admin.firestore.Timestamp).toDate().toISOString() : undefined,
        deletedAt: data.deletedAt ? (data.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
      };
    });
    
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    
    return NextResponse.json({ 
        data: orders, 
        pagination: { 
            count: orders.length,
            nextCursor: nextCursor 
        } 
    });

  } catch (error: any) {
    console.error('Error fetching orders:', error);
     if (error.code === 'failed-precondition') {
      return NextResponse.json({ 
        error: 'Query requires an index. Please create the necessary composite index in Firestore. Check server logs for details.',
        details: error.message
      }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch orders.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

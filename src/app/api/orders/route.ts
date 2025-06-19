
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { OrderDocument, OrderStatus } from '@/lib/types/firestore';

export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
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
  const dateFrom = searchParams.get('dateFrom'); // ISO string
  const dateTo = searchParams.get('dateTo');     // ISO string
  const fieldsParam = searchParams.get('fields'); // For field selection

  try {
    let query: admin.firestore.Query<admin.firestore.DocumentData> = db.collection('orders')
                                                                    .where('companyId', '==', companyId)
                                                                    .where('deletedAt', '==', null);

    // Required Firestore indexes:
    // - (companyId, type, status, orderDate) for common filtering
    // - (companyId, supplierId, orderDate) if filtering by supplier is common
    // - (companyId, orderDate) for default sort
    if (status) query = query.where('status', '==', status);
    if (type) query = query.where('type', '==', type);
    if (supplierId) query = query.where('supplierId', '==', supplierId);
    
    if (dateFrom && dateTo) {
        const from = AdminTimestamp.fromDate(new Date(dateFrom));
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        const to = AdminTimestamp.fromDate(toDate);
        query = query.where('orderDate', '>=', from).where('orderDate', '<=', to);
    } else if (dateFrom) {
        query = query.where('orderDate', '>=', AdminTimestamp.fromDate(new Date(dateFrom)));
    } else if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query = query.where('orderDate', '<=', AdminTimestamp.fromDate(toDate));
    }
    
    query = query.orderBy('orderDate', 'desc'); // Default sort order

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
        // Always include essential fields like 'id', 'orderNumber', 'status', 'type', 'orderDate', 'totalAmount'
        selectedFields = Array.from(new Set(['id', 'orderNumber', 'status', 'type', 'orderDate', 'totalAmount', ...selectedFields]));
    }


    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      const baseData = {
        id: doc.id,
        orderNumber: data.orderNumber,
        type: data.type,
        status: data.status,
        totalAmount: data.totalAmount,
        orderDate: (data.orderDate as AdminTimestamp)?.toDate().toISOString(),
        expectedDate: (data.expectedDate as AdminTimestamp)?.toDate()?.toISOString() || null,
        actualDeliveryDate: (data.actualDeliveryDate as AdminTimestamp)?.toDate()?.toISOString() || null,
        supplierId: data.supplierId,
        // Add other frequently accessed list fields
      };

      if (selectedFields) {
        const filteredData: Partial<OrderDocument> & { id: string } = { id: doc.id };
        selectedFields.forEach(field => {
          if (field === 'id') return;
          if ((baseData as any)[field] !== undefined) {
             (filteredData as any)[field] = (baseData as any)[field];
          } else if ((data as any)[field] !== undefined) {
            // Handle fields not in baseData, like items, notes etc.
            // Convert timestamps if they are one of the selected fields
            const val = data[field];
            if (val instanceof AdminTimestamp) {
                (filteredData as any)[field] = val.toDate().toISOString();
            } else {
                (filteredData as any)[field] = val;
            }
          }
        });
        return filteredData;
      }
      return baseData; // Return full OrderDocument structure if no fields specified
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

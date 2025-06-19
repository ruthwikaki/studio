
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { OrderDocument, OrderStatus } from '@/lib/types/firestore';

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const status = searchParams.get('status') as OrderStatus | null;
  const type = searchParams.get('type') as 'purchase' | 'sales' | 'transfer' | null;
  const supplierId = searchParams.get('supplierId');
  const dateFrom = searchParams.get('dateFrom'); // ISO string
  const dateTo = searchParams.get('dateTo');     // ISO string

  try {
    let query: admin.firestore.Query<admin.firestore.DocumentData> = db.collection('orders').where('companyId', '==', companyId);

    if (status) {
      query = query.where('status', '==', status);
    }
    if (type) {
      query = query.where('type', '==', type);
    }
    if (supplierId) {
      query = query.where('supplierId', '==', supplierId);
    }
    if (dateFrom) {
      query = query.where('orderDate', '>=', AdminTimestamp.fromDate(new Date(dateFrom)));
    }
    if (dateTo) {
      // Adjust dateTo to include the whole day
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('orderDate', '<=', AdminTimestamp.fromDate(toDate));
    }
    
    // Default sort order
    query = query.orderBy('orderDate', 'desc');

    // Count total items for pagination before applying limit/offset
    const totalItemsSnapshot = await query.count().get();
    const totalItems = totalItemsSnapshot.data().count;
    const totalPages = Math.ceil(totalItems / limit);

    // Apply pagination
    const paginatedQuery = query.limit(limit).offset((page - 1) * limit);
    const snapshot = await paginatedQuery.get();
    
    const orders: OrderDocument[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        orderDate: (data.orderDate as AdminTimestamp)?.toDate().toISOString(),
        expectedDate: (data.expectedDate as AdminTimestamp)?.toDate()?.toISOString() || null,
        actualDeliveryDate: (data.actualDeliveryDate as AdminTimestamp)?.toDate()?.toISOString() || null,
        createdAt: (data.createdAt as AdminTimestamp)?.toDate().toISOString(),
        lastUpdated: (data.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
      } as OrderDocument;
    });
    
    return NextResponse.json({ 
        data: orders, 
        pagination: { currentPage: page, pageSize: limit, totalItems, totalPages } 
    });

  } catch (error: any) {
    console.error('Error fetching orders:', error);
     if (error.code === 'failed-precondition') {
      return NextResponse.json({ 
        error: 'Query requires an index. Please create the necessary composite index in Firestore.',
        details: error.message
      }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch orders.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Note: POST for creating orders is handled by /api/orders/create-po for Purchase Orders.
// A similar dedicated route or logic within this POST could handle Sales Orders if needed.

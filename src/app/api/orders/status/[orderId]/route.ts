
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { OrderDocument, OrderStatus, InventoryStockDocument } from '@/lib/types/firestore';
import { z } from 'zod';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const ValidOrderStatuses = z.enum([
  'pending_approval', 'pending_payment', 'pending', 'processing', 
  'pending_fulfillment', 'awaiting_shipment', 'awaiting_delivery', 
  'partially_shipped', 'partially_delivered', 'shipped', 'delivered', 
  'completed', 'cancelled', 'disputed', 'on_hold'
]);

const UpdateOrderStatusSchema = z.object({
  status: ValidOrderStatuses,
  actualDeliveryDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Actual delivery date must be a valid date string if provided",
  }),
});

export async function PUT(request: NextRequest, { params }: { params: { orderId: string } }) {
  if (!isAdminInitialized()) {
    console.error("[API Order Status] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Order Status] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed.' }, { status: 401 });
  }

  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validationResult = UpdateOrderStatusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid status update data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { status: newStatus, actualDeliveryDate: newActualDeliveryDateStr } = validationResult.data;

    const orderRef = db.collection('orders').doc(orderId);

    const updatedOrderData = await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error('Order not found.');
      }

      const orderData = orderDoc.data() as OrderDocument;
      if (orderData.companyId !== companyId) {
        throw new Error('Access denied to this order.');
      }

      const updatePayload: any = {
        status: newStatus,
        lastUpdated: FieldValue.serverTimestamp(),
        lastUpdatedBy: userId,
      };

      if (newActualDeliveryDateStr) {
        updatePayload.actualDeliveryDate = admin.firestore.Timestamp.fromDate(new Date(newActualDeliveryDateStr));
      }

      transaction.update(orderRef, updatePayload);

      if (orderData.type === 'purchase' && (newStatus === 'delivered' || newStatus === 'completed')) {
        for (const item of orderData.items) {
          const inventoryQuery = db.collection('inventory')
            .where('companyId', '==', companyId)
            .where('sku', '==', item.sku)
            .limit(1);
          
          const inventorySnapshot = await transaction.get(inventoryQuery);

          if (!inventorySnapshot.empty) {
            const inventoryDocRef = inventorySnapshot.docs[0].ref;
            const inventoryUpdate = {
              quantity: FieldValue.increment(item.quantity),
              lastUpdated: FieldValue.serverTimestamp(),
              lastUpdatedBy: userId,
            };
            transaction.update(inventoryDocRef, inventoryUpdate);
          } else {
            console.warn(`Inventory item with SKU ${item.sku} for company ${companyId} not found during PO receiving. Order ID: ${orderId}`);
          }
        }
      }
      // Return the original data merged with the update payload for optimistic response.
      // The actual server timestamps will be fetched after the transaction.
      return { id: orderDoc.id, ...orderData, ...updatePayload, actualDeliveryDate: updatePayload.actualDeliveryDate || orderData.actualDeliveryDate };
    });
    
    const finalDocSnap = await orderRef.get();
    const finalData = finalDocSnap.data();
    const responseOrder = {
        id: finalDocSnap.id,
        ...finalData,
        orderDate: (finalData?.orderDate as admin.firestore.Timestamp)?.toDate().toISOString(),
        expectedDate: (finalData?.expectedDate as admin.firestore.Timestamp)?.toDate()?.toISOString() || null,
        actualDeliveryDate: (finalData?.actualDeliveryDate as admin.firestore.Timestamp)?.toDate()?.toISOString() || null,
        createdAt: (finalData?.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        lastUpdated: (finalData?.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
        deletedAt: finalData?.deletedAt ? (finalData.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
    } as OrderDocument;

    return NextResponse.json({ data: responseOrder, message: `Order ${orderId} status updated to ${newStatus}.` });

  } catch (error: any) {
    console.error(`Error updating order ${orderId} status:`, error);
    const message = error.message || `Failed to update order status.`;
    if (message === 'Order not found.') return NextResponse.json({ error: message }, { status: 404 });
    if (message === 'Access denied to this order.') return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

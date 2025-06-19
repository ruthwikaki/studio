
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { OrderDocument, OrderStatus, InventoryStockDocument } from '@/lib/types/firestore';
import { z } from 'zod';

// Define valid order statuses, ensure this matches your OrderStatus type in firestore.ts
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
  // Add other fields that might be updated with status change, e.g., trackingNumber
});

export async function PUT(request: NextRequest, { params }: { params: { orderId: string } }) {
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
        throw new Error('Order not found.'); // Caught by transaction, results in 404-like
      }

      const orderData = orderDoc.data() as OrderDocument;
      if (orderData.companyId !== companyId) {
        throw new Error('Access denied to this order.'); // Results in 403-like
      }

      const updatePayload: any = {
        status: newStatus,
        lastUpdated: FieldValue.serverTimestamp(),
        lastUpdatedBy: userId,
      };

      if (newActualDeliveryDateStr) {
        updatePayload.actualDeliveryDate = AdminTimestamp.fromDate(new Date(newActualDeliveryDateStr));
      }

      transaction.update(orderRef, updatePayload);

      // If PO is marked as 'delivered' or 'completed', update inventory stock
      if (orderData.type === 'purchase' && (newStatus === 'delivered' || newStatus === 'completed')) {
        for (const item of orderData.items) {
          const inventoryQuery = db.collection('inventory')
            .where('companyId', '==', companyId)
            .where('sku', '==', item.sku)
            .limit(1);
          
          const inventorySnapshot = await transaction.get(inventoryQuery); // Get within transaction

          if (!inventorySnapshot.empty) {
            const inventoryDocRef = inventorySnapshot.docs[0].ref;
            const inventoryUpdate = {
              quantity: FieldValue.increment(item.quantity),
              lastUpdated: FieldValue.serverTimestamp(),
              lastUpdatedBy: userId,
              // TODO: Potentially decrement an "onOrderQuantity" field here if it exists
            };
            transaction.update(inventoryDocRef, inventoryUpdate);
          } else {
            // Item from PO not found in inventory - this is a data integrity issue or new item.
            // Decide how to handle: create it, or log an error. For now, we'll log.
            console.warn(`Inventory item with SKU ${item.sku} for company ${companyId} not found during PO receiving. Order ID: ${orderId}`);
            // Optionally, create the inventory item here if that's desired behavior.
            // const newInvRef = db.collection('inventory').doc();
            // transaction.set(newInvRef, { /* ... new inventory item data ... */ });
          }
        }
      }
      return { id: orderDoc.id, ...orderData, ...updatePayload }; // Return optimistic update
    });
    
    // Fetch the document again to get actual server timestamps
    const finalDocSnap = await orderRef.get();
    const finalData = finalDocSnap.data();
    const responseOrder = {
        id: finalDocSnap.id,
        ...finalData,
        orderDate: (finalData?.orderDate as AdminTimestamp)?.toDate().toISOString(),
        expectedDate: (finalData?.expectedDate as AdminTimestamp)?.toDate()?.toISOString() || null,
        actualDeliveryDate: (finalData?.actualDeliveryDate as AdminTimestamp)?.toDate()?.toISOString() || null,
        createdAt: (finalData?.createdAt as AdminTimestamp)?.toDate().toISOString(),
        lastUpdated: (finalData?.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
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

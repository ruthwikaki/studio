
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { OrderDocument, OrderItem as FirestoreOrderItem, ProductDocument } from '@/lib/types/firestore'; // Renamed to avoid conflict
import { z } from 'zod';

const CreateOrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"), // This should be the ID from the 'products' collection
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"), // unitCost in PO context
});

const CreatePORequestSchema = z.object({
  items: z.array(CreateOrderItemSchema).min(1, "At least one item is required for a PO"),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
  expectedDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Expected date must be a valid date string if provided",
  }),
});

export async function POST(request: NextRequest) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = CreatePORequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid PO data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { items, supplierId, notes, expectedDate } = validationResult.data;

    let totalAmount = 0;
    const orderItems: FirestoreOrderItem[] = items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      totalAmount += itemTotal;
      return { 
        productId: item.productId, 
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice, // This is cost for a PO
        totalCost: itemTotal 
      };
    });

    // Generate unique PO number
    const poPrefix = `PO-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-`;
    const orderCounterRef = db.collection('counters').doc(`order_${companyId}`);
    const newOrderNumber = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(orderCounterRef);
        let nextCount = 1;
        if (counterDoc.exists) {
            nextCount = (counterDoc.data()?.count || 0) + 1;
        }
        transaction.set(orderCounterRef, { count: nextCount }, { merge: true });
        return `${poPrefix}${String(nextCount).padStart(4, '0')}`;
    });


    const newOrderRef = db.collection('orders').doc();
    const newOrderData: Omit<OrderDocument, 'id' | 'createdAt' | 'lastUpdated'> = {
      companyId,
      orderNumber: newOrderNumber,
      type: 'purchase',
      supplierId: supplierId || undefined,
      items: orderItems,
      totalAmount,
      status: 'pending', // Or 'pending_approval' if workflow requires it
      orderDate: FieldValue.serverTimestamp() as AdminTimestamp,
      expectedDate: expectedDate ? AdminTimestamp.fromDate(new Date(expectedDate)) : undefined,
      notes: notes || undefined,
      createdBy: userId,
    };

    await newOrderRef.set({
      ...newOrderData,
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    });

    // TODO: Implement "on order" quantity update in inventory.
    // This would typically involve fetching each item in `orderItems` from the `inventory` collection
    // and incrementing an `onOrderQuantity` field. This requires adding `onOrderQuantity` to `InventoryStockDocument`.
    // Example (pseudo-code, needs `onOrderQuantity` field):
    // const inventoryBatch = db.batch();
    // for (const item of orderItems) {
    //   const invQuery = await db.collection('inventory').where('companyId', '==', companyId).where('sku', '==', item.sku).limit(1).get();
    //   if (!invQuery.empty) {
    //     const invDocRef = invQuery.docs[0].ref;
    //     inventoryBatch.update(invDocRef, { onOrderQuantity: FieldValue.increment(item.quantity) });
    //   }
    // }
    // await inventoryBatch.commit();

    const createdDoc = await newOrderRef.get();
    const createdOrder = {
        id: createdDoc.id,
        ...createdDoc.data(),
        orderDate: (createdDoc.data()?.orderDate as AdminTimestamp)?.toDate().toISOString(),
        createdAt: (createdDoc.data()?.createdAt as AdminTimestamp)?.toDate().toISOString(),
        lastUpdated: (createdDoc.data()?.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
        expectedDate: (createdDoc.data()?.expectedDate as AdminTimestamp)?.toDate().toISOString(),
    } as OrderDocument;

    return NextResponse.json({ data: createdOrder, message: 'Purchase Order created successfully.' });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    const message = error.message || 'Failed to create purchase order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { OrderDocument, OrderItem as FirestoreOrderItem, ProductDocument, CounterDocument } from '@/lib/types/firestore';
import { z } from 'zod';

const CreateOrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"), 
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"), // unitCost in PO context
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
        unitPrice: item.unitPrice, 
        totalCost: itemTotal 
      };
    });

    const poPrefix = `PO-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-`;
    const orderCounterRef = db.collection('counters').doc(`order_${companyId}_purchase`); // More specific counter for POs

    const newOrderNumber = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(orderCounterRef);
        let nextCount = 1;
        if (counterDoc.exists) {
            nextCount = ((counterDoc.data() as CounterDocument)?.count || 0) + 1;
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
      status: 'pending', 
      orderDate: FieldValue.serverTimestamp() as AdminTimestamp,
      expectedDate: expectedDate ? AdminTimestamp.fromDate(new Date(expectedDate)) : undefined,
      notes: notes || undefined,
      createdBy: userId,
      lastUpdatedBy: userId, // Set on create as well
    };

    await newOrderRef.set({
      ...newOrderData,
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    });

    const createdDoc = await newOrderRef.get();
    const createdData = createdDoc.data()!; // Assert data exists
    const createdOrder: OrderDocument = {
        id: createdDoc.id,
        ...createdData,
        orderDate: (createdData.orderDate as AdminTimestamp)?.toDate().toISOString(),
        createdAt: (createdData.createdAt as AdminTimestamp)?.toDate().toISOString(),
        lastUpdated: (createdData.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
        expectedDate: createdData.expectedDate ? (createdData.expectedDate as AdminTimestamp).toDate().toISOString() : undefined,
    } as OrderDocument;

    return NextResponse.json({ data: createdOrder, message: 'Purchase Order created successfully.' });
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    const message = error.message || 'Failed to create purchase order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

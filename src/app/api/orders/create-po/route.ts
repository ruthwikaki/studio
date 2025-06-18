
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// import { getFirestoreAdmin, FieldValue } from 'firebase-admin/firestore'; // Placeholder
// import { verifyAuthToken } from '@/lib/firebase/admin-auth'; // Placeholder
import type { OrderDocument, OrderItem } from '@/lib/types/firestore';
import { z } from 'zod';

// Placeholder for Firestore instance
// const db = getFirestoreAdmin();

const OrderItemSchema = z.object({
  productId: z.string(), // SKU or ID
  name: z.string(),
  sku: z.string(),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

const CreatePORequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  supplierId: z.string().optional(), // Assuming one supplier per PO for simplicity
  notes: z.string().optional(),
  expectedDate: z.string().optional(), // ISO date string
});

export async function POST(request: NextRequest) {
  // TODO: Implement Firebase Auth token verification
  // const { uid } = await verifyAuthToken(request);
  // if (!uid) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  const userId = "mockUserId"; // Replace with actual uid

  try {
    const body = await request.json();
    const validationResult = CreatePORequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid PO data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { items, supplierId, notes, expectedDate } = validationResult.data;

    let totalAmount = 0;
    const orderItems: OrderItem[] = items.map(item => {
      const itemTotal = item.quantity * item.unitCost;
      totalAmount += itemTotal;
      return { ...item, totalCost: itemTotal };
    });

    const newOrder: Omit<OrderDocument, 'id' | 'createdAt' | 'lastUpdated'> = {
      userId,
      orderNumber: `PO-${Date.now()}`, // Simple unique order number
      type: 'purchase',
      supplierId: supplierId || undefined,
      items: orderItems,
      totalAmount,
      status: 'pending',
      orderDate: new Date() as any, // FieldValue.serverTimestamp()
      expectedDate: expectedDate ? (new Date(expectedDate) as any) : undefined,
      notes: notes || undefined,
    };

    // Placeholder for Firestore document creation
    // const orderRef = db.collection('orders').doc();
    // await orderRef.set({
    //   ...newOrder,
    //   createdAt: FieldValue.serverTimestamp(),
    //   lastUpdated: FieldValue.serverTimestamp(),
    // });
    // const createdOrder = { id: orderRef.id, ...newOrder, createdAt: new Date(), lastUpdated: new Date() };

    const mockCreatedOrder: OrderDocument = {
        id: "mockOrderId_" + Date.now(),
        ...newOrder,
        orderDate: new Date(),
        createdAt: new Date() as any,
        lastUpdated: new Date() as any,
    }


    return NextResponse.json({ data: mockCreatedOrder, message: 'Purchase Order created successfully.' });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    const message = error instanceof Error ? error.message : 'Failed to create purchase order.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { z } from 'zod';
import type { OrderDocument } from '@/lib/types/firestore';

const ScoreRequestSchema = z.object({
  supplierId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = ScoreRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { supplierId } = validationResult.data;

    const supplierRef = db.collection('suppliers').doc(supplierId);
    const supplierDoc = await supplierRef.get();

    if (!supplierDoc.exists) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }
    if (supplierDoc.data()?.companyId !== companyId) {
      return NextResponse.json({ error: 'Access denied to this supplier.' }, { status: 403 });
    }

    // Simplified Reliability Score Calculation
    // Fetch recent orders from this supplier (e.g., last 50 completed/delivered purchase orders)
    const ordersSnapshot = await db.collection('orders')
                                   .where('companyId', '==', companyId)
                                   .where('supplierId', '==', supplierId)
                                   .where('type', '==', 'purchase')
                                   .where('status', 'in', ['delivered', 'completed']) // Consider only finished orders
                                   .orderBy('orderDate', 'desc')
                                   .limit(50) // Limit for performance
                                   .get();

    let onTimeDeliveries = 0;
    let totalRelevantOrders = 0;
    let baseScore = 75; // Start with a base score

    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data() as OrderDocument;
      totalRelevantOrders++;
      if (order.expectedDate && order.actualDeliveryDate) {
        const expected = (order.expectedDate as AdminTimestamp).toDate();
        const actual = (order.actualDeliveryDate as AdminTimestamp).toDate();
        if (actual <= expected) {
          onTimeDeliveries++;
        }
      } else {
        // If dates are missing, count as neutral or slightly penalize
        onTimeDeliveries += 0.5; // Neutral contribution if dates missing
      }
    });

    if (totalRelevantOrders > 0) {
      const onTimeRate = (onTimeDeliveries / totalRelevantOrders);
      // Scale onTimeRate (0-1) to a score impact (e.g., +/- 20 points)
      // If onTimeRate is 1 (100%), adds 20. If 0.5 (50%), adds 0. If 0, subtracts 20.
      const scoreImpactFromDelivery = (onTimeRate - 0.5) * 40; 
      baseScore += scoreImpactFromDelivery;
    }
    
    // Placeholder for quality & communication factors (would need more data models)
    // For now, let's add a small random factor to simulate other influences or if no order data
    if (totalRelevantOrders < 5) { // If few orders, make score less certain
        baseScore += (Math.random() * 10) - 5; // +/- 5 points
    }

    const newCalculatedScore = Math.max(0, Math.min(100, Math.round(baseScore)));

    await supplierRef.update({
      reliabilityScore: newCalculatedScore,
      lastUpdated: FieldValue.serverTimestamp(),
      lastUpdatedBy: userId,
    });

    return NextResponse.json({ 
        data: { 
            supplierId, 
            newReliabilityScore: newCalculatedScore,
            message: `Reliability score for supplier ${supplierId} recalculated.`
        } 
    });
  } catch (error: any) {
    console.error('Error calculating supplier score:', error);
    const message = error.message || 'Failed to calculate supplier score.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

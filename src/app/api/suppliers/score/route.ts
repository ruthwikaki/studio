
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { z } from 'zod';
import type { OrderDocument } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const ScoreRequestSchema = z.object({
  supplierId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Supplier Score] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Supplier Score] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }
  
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

    const ordersSnapshot = await db.collection('orders')
                                   .where('companyId', '==', companyId)
                                   .where('supplierId', '==', supplierId)
                                   .where('type', '==', 'purchase')
                                   .where('status', 'in', ['delivered', 'completed'])
                                   .orderBy('orderDate', 'desc')
                                   .limit(50)
                                   .get();

    let onTimeDeliveries = 0;
    let totalRelevantOrders = 0;
    let baseScore = 75;

    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data() as OrderDocument;
      totalRelevantOrders++;
      if (order.expectedDate && order.actualDeliveryDate) {
        const expected = (order.expectedDate as admin.firestore.Timestamp).toDate();
        const actual = (order.actualDeliveryDate as admin.firestore.Timestamp).toDate();
        if (actual <= expected) {
          onTimeDeliveries++;
        }
      } else {
        onTimeDeliveries += 0.5;
      }
    });

    if (totalRelevantOrders > 0) {
      const onTimeRate = (onTimeDeliveries / totalRelevantOrders);
      const scoreImpactFromDelivery = (onTimeRate - 0.5) * 40; 
      baseScore += scoreImpactFromDelivery;
    }
    
    if (totalRelevantOrders < 5) {
        baseScore += (Math.random() * 10) - 5;
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

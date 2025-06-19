
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';

interface AlertItem extends InventoryStockDocument {
  urgency: 'Critical' | 'Warning';
}

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await verifyAuthToken(request);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized or companyId missing.' }, { status: 401 });
    }

    // Fetch all items for the company and then filter.
    // Firestore doesn't directly support comparing two fields (quantity <= reorderPoint) in a query.
    // For larger datasets, consider a denormalized 'isLowStock' field updated by a Cloud Function.
    const inventorySnapshot = await db.collection('inventory')
                                      .where('companyId', '==', companyId)
                                      .get();

    const allItems: InventoryStockDocument[] = inventorySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastUpdated: (data.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
      } as InventoryStockDocument;
    });

    const lowStockItems = allItems.filter(item => item.quantity <= item.reorderPoint && item.reorderPoint > 0);

    const alerts: AlertItem[] = lowStockItems.map(item => ({
      ...item,
      urgency: item.quantity === 0 ? 'Critical' : 'Warning',
    }));
    
    return NextResponse.json({ data: alerts });
  } catch (error: any) {
    console.error('Error fetching inventory alerts:', error);
    const message = error.message || 'Failed to fetch inventory alerts.';
    if (error.code === 'MODULE_NOT_FOUND' || error.message.includes("Service account key not found")) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

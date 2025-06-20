
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

interface AlertItem extends InventoryStockDocument {
  urgency: 'Critical' | 'Warning';
}

export async function GET(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Inventory Alerts] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Inventory Alerts] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  try {
    const { companyId } = await verifyAuthToken(request);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized or companyId missing.' }, { status: 401 });
    }

    const inventorySnapshot = await db.collection('inventory')
                                      .where('companyId', '==', companyId)
                                      .where('deletedAt', '==', null)
                                      .get();

    const allItems: InventoryStockDocument[] = inventorySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastUpdated: (data.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
        createdAt: (data.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        deletedAt: data.deletedAt ? (data.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
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
    if (error.code === 'MODULE_NOT_FOUND' || (error.message && error.message.includes("Service account key not found"))) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

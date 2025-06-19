
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument, OrderDocument, SalesHistoryDocument } from '@/lib/types/firestore';

export const revalidate = 300; // Revalidate every 5 minutes

interface DashboardKPIs {
  totalInventoryValue: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  pendingOrdersCount: number;
  todaysRevenue: number;
  // turnoverRate?: number; // Complex, might be better as a separate calculation or from a daily report
}

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    // 1. Inventory Metrics
    const inventorySnapshot = await db.collection('inventory')
                                      .where('companyId', '==', companyId)
                                      .get();
    
    let totalInventoryValue = 0;
    let lowStockItemsCount = 0;
    let outOfStockItemsCount = 0;

    inventorySnapshot.docs.forEach(doc => {
      const item = doc.data() as InventoryStockDocument;
      totalInventoryValue += (item.quantity || 0) * (item.unitCost || 0);
      if (item.quantity <= item.reorderPoint && item.reorderPoint > 0) {
        lowStockItemsCount++;
      }
      if (item.quantity <= 0) {
        outOfStockItemsCount++;
      }
    });

    // 2. Pending Orders Count
    const pendingOrdersSnapshot = await db.collection('orders')
                                          .where('companyId', '==', companyId)
                                          .where('status', 'in', ['pending', 'pending_approval', 'pending_payment', 'processing', 'pending_fulfillment', 'awaiting_shipment'])
                                          .count()
                                          .get();
    const pendingOrdersCount = pendingOrdersSnapshot.data().count;

    // 3. Today's Revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

    const salesTodaySnapshot = await db.collection('sales_history')
                                        .where('companyId', '==', companyId)
                                        .where('date', '>=', AdminTimestamp.fromDate(today))
                                        .where('date', '<', AdminTimestamp.fromDate(tomorrow))
                                        .get();
    let todaysRevenue = 0;
    salesTodaySnapshot.docs.forEach(doc => {
      const sale = doc.data() as SalesHistoryDocument;
      todaysRevenue += sale.revenue || 0;
    });

    const kpis: DashboardKPIs = {
      totalInventoryValue,
      lowStockItemsCount,
      outOfStockItemsCount,
      pendingOrdersCount,
      todaysRevenue,
    };

    return NextResponse.json({ data: kpis });
  } catch (error: any) {
    console.error('Error fetching dashboard analytics:', error);
    const message = error.message || 'Failed to fetch dashboard analytics.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

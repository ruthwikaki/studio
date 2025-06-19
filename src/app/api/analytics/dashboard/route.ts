
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
      // Defensive coding for potentially missing or non-numeric fields
      const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      const unitCost = typeof item.unitCost === 'number' ? item.unitCost : 0;
      const reorderPoint = typeof item.reorderPoint === 'number' ? item.reorderPoint : 0;

      totalInventoryValue += quantity * unitCost;
      if (reorderPoint > 0 && quantity <= reorderPoint) { // Ensure reorderPoint is positive before comparison
        lowStockItemsCount++;
      }
      if (quantity <= 0) {
        outOfStockItemsCount++;
      }
    });

    // 2. Pending Orders Count
    // Consider only actionable pending states for a PO workflow
    const pendingStatuses: OrderDocument['status'][] = ['pending', 'pending_approval', 'processing', 'awaiting_shipment'];
    // For Sales Orders, you might include 'pending_payment', 'pending_fulfillment'
    
    const pendingOrdersSnapshot = await db.collection('orders')
                                          .where('companyId', '==', companyId)
                                          .where('type', '==', 'purchase') // Example: counting pending POs
                                          .where('status', 'in', pendingStatuses)
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
      const revenue = typeof sale.revenue === 'number' ? sale.revenue : 0;
      todaysRevenue += revenue;
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
    // Check for Firestore-specific error codes, like 'failed-precondition' for missing indexes
    if (error.code === 'failed-precondition') {
        return NextResponse.json({ 
            error: 'A Firestore query failed, possibly due to a missing index. Please check server logs for a link to create the index.',
            details: error.message 
        }, { status: 500 });
    }
    const message = error.message || 'Failed to fetch dashboard analytics.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

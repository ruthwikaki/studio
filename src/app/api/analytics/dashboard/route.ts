
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument, OrderDocument, SalesHistoryDocument, DailyAggregateDocument } from '@/lib/types/firestore';

export const revalidate = 300; // Revalidate every 5 minutes

interface DashboardKPIs {
  totalInventoryValue: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  pendingOrdersCount: number;
  todaysRevenue: number;
  inventoryValueByCategory?: Record<string, number>;
  lastUpdated: string;
  turnoverRate?: number;
}

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    // --- CONCEPTUAL: Fetch from pre-aggregated data ---
    // In a production system, these KPIs would ideally be read from a
    // pre-aggregated document (e.g., 'daily_aggregates' collection)
    // updated by a scheduled Cloud Function.

    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const aggregateDocId = `${companyId}_${todayStr}`;
    const aggregateDocRef = db.collection('daily_aggregates').doc(aggregateDocId);
    
    console.time(`fetchAggregateDashboardData-${companyId}`);
    const aggregateDocSnap = await aggregateDocRef.get();
    console.timeEnd(`fetchAggregateDashboardData-${companyId}`);

    if (aggregateDocSnap.exists) {
      const aggData = aggregateDocSnap.data() as DailyAggregateDocument;
      const kpis: DashboardKPIs = {
        totalInventoryValue: aggData.totalInventoryValue || 0,
        lowStockItemsCount: aggData.lowStockItemsCount || 0,
        outOfStockItemsCount: aggData.outOfStockItemsCount || 0,
        pendingOrdersCount: 0, // This would also come from aggregates or a separate quick query
        todaysRevenue: aggData.todaysRevenue || 0,
        inventoryValueByCategory: aggData.inventoryValueByCategory || {},
        lastUpdated: (aggData.lastCalculated as AdminTimestamp)?.toDate().toISOString() || new Date().toISOString(),
      };
      
      // Quick fetch for pending orders as it's usually dynamic
      const pendingOrdersSnapshot = await db.collection('orders')
                                          .where('companyId', '==', companyId)
                                          .where('type', '==', 'purchase')
                                          .where('status', 'in', ['pending', 'pending_approval', 'processing', 'awaiting_shipment'])
                                          .where('deletedAt', '==', null)
                                          .count()
                                          .get();
      kpis.pendingOrdersCount = pendingOrdersSnapshot.data().count;

      return NextResponse.json({ data: kpis, source: 'aggregate' });
    } else {
      // --- FALLBACK: Calculate live if aggregate not found (costly for production) ---
      console.warn(`Aggregate document ${aggregateDocId} not found. Calculating live KPIs for dashboard for company ${companyId} (this can be slow).`);
      
      console.time(`calculateLiveDashboardData-${companyId}`);
      const inventorySnapshot = await db.collection('inventory')
                                        .where('companyId', '==', companyId)
                                        .where('deletedAt', '==', null) // Assuming soft deletes
                                        .get();
      
      let totalInventoryValue = 0;
      let lowStockItemsCount = 0;
      let outOfStockItemsCount = 0;
      const inventoryValueByCategory: Record<string, number> = {};

      inventorySnapshot.docs.forEach(doc => {
        const item = doc.data() as InventoryStockDocument;
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        const unitCost = typeof item.unitCost === 'number' ? item.unitCost : 0;
        const reorderPoint = typeof item.reorderPoint === 'number' ? item.reorderPoint : 0;
        const category = typeof item.category === 'string' ? item.category : 'Uncategorized';
        const itemValue = quantity * unitCost;

        totalInventoryValue += itemValue;
        if (reorderPoint > 0 && quantity <= reorderPoint) lowStockItemsCount++;
        if (quantity <= 0) outOfStockItemsCount++;
        
        inventoryValueByCategory[category] = (inventoryValueByCategory[category] || 0) + itemValue;
      });

      const pendingStatuses: string[] = ['pending', 'pending_approval', 'processing', 'awaiting_shipment'];
      const pendingOrdersSnapshot = await db.collection('orders')
                                            .where('companyId', '==', companyId)
                                            .where('type', '==', 'purchase')
                                            .where('status', 'in', pendingStatuses)
                                            .where('deletedAt', '==', null)
                                            .count()
                                            .get();
      const pendingOrdersCount = pendingOrdersSnapshot.data().count;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const salesTodaySnapshot = await db.collection('sales_history')
                                          .where('companyId', '==', companyId)
                                          .where('date', '>=', AdminTimestamp.fromDate(today))
                                          .where('date', '<', AdminTimestamp.fromDate(tomorrow))
                                          .where('deletedAt', '==', null)
                                          .get();
      let todaysRevenue = 0;
      salesTodaySnapshot.docs.forEach(doc => {
        const sale = doc.data() as SalesHistoryDocument;
        todaysRevenue += typeof sale.revenue === 'number' ? sale.revenue : 0;
      });
      console.timeEnd(`calculateLiveDashboardData-${companyId}`);

      const kpis: DashboardKPIs = {
        totalInventoryValue,
        lowStockItemsCount,
        outOfStockItemsCount,
        pendingOrdersCount,
        todaysRevenue,
        inventoryValueByCategory,
        lastUpdated: new Date().toISOString(),
      };

      return NextResponse.json({ data: kpis, source: 'live_calculation' });
    }
  } catch (error: any) {
    console.error(`Error fetching dashboard analytics for company ${companyId}:`, error);
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


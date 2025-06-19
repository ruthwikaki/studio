
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
  let userId: string; 
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
    console.log(`[Analytics Dashboard API] Authenticated user ${userId} for company ${companyId}`);
  } catch (authError: any) {
    console.error("[Analytics Dashboard API] Authentication error:", authError.message);
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const todayForAggId = new Date();
    todayForAggId.setUTCHours(0,0,0,0); // Use UTC start of day for ID consistency
    const todayStr = todayForAggId.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    const aggregateDocId = `${companyId}_${todayStr}`;
    const aggregateDocRef = db.collection('daily_aggregates').doc(aggregateDocId);
    
    console.log(`[Analytics Dashboard API] Attempting to fetch aggregate: ${aggregateDocId}`);
    const aggregateDocSnap = await aggregateDocRef.get();

    if (aggregateDocSnap.exists) {
      console.log(`[Analytics Dashboard API] Aggregate document ${aggregateDocId} found.`);
      const aggData = aggregateDocSnap.data() as DailyAggregateDocument;
      const kpis: DashboardKPIs = {
        totalInventoryValue: aggData.totalInventoryValue || 0,
        lowStockItemsCount: aggData.lowStockItemsCount || 0,
        outOfStockItemsCount: aggData.outOfStockItemsCount || 0,
        pendingOrdersCount: 0, 
        todaysRevenue: aggData.todaysRevenue || 0,
        inventoryValueByCategory: aggData.inventoryValueByCategory || {},
        lastUpdated: (aggData.lastCalculated as AdminTimestamp)?.toDate()?.toISOString() || new Date().toISOString(),
        turnoverRate: aggData.turnoverRate,
      };
      
      const pendingOrdersSnapshot = await db.collection('orders')
                                          .where('companyId', '==', companyId)
                                          .where('type', '==', 'purchase')
                                          .where('status', 'in', ['pending', 'pending_approval', 'processing', 'awaiting_shipment'])
                                          .where('deletedAt', '==', null)
                                          .count()
                                          .get();
      kpis.pendingOrdersCount = pendingOrdersSnapshot.data().count;
      console.log(`[Analytics Dashboard API] KPIs from aggregate (pending orders fetched live):`, kpis);
      return NextResponse.json({ data: kpis, source: 'aggregate' });
    } else {
      console.warn(`[Analytics Dashboard API] Aggregate document ${aggregateDocId} not found. Calculating live KPIs for company ${companyId}. This can be slow and might indicate a missing daily aggregation job or date mismatch (UTC vs local).`);
      
      console.time(`calculateLiveDashboardData-${companyId}`);
      const inventorySnapshot = await db.collection('inventory')
                                        .where('companyId', '==', companyId)
                                        .where('deletedAt', '==', null) 
                                        .get();
      console.log(`[Analytics Dashboard API] Fetched ${inventorySnapshot.docs.length} inventory items for live calculation.`);
      
      let totalInventoryValue = 0;
      let lowStockItemsCount = 0;
      let outOfStockItemsCount = 0;
      const inventoryValueByCategory: Record<string, number> = {};

      inventorySnapshot.docs.forEach(doc => {
        const item = doc.data() as InventoryStockDocument;
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        const unitCost = typeof item.unitCost === 'number' ? item.unitCost : 0;
        const reorderPoint = typeof item.reorderPoint === 'number' ? item.reorderPoint : 0;
        const category = typeof item.category === 'string' && item.category ? item.category : 'Uncategorized';
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

      const todayStartForSales = new Date(); // Use local server time for "today's" sales
      todayStartForSales.setHours(0, 0, 0, 0);
      const tomorrowStartForSales = new Date(todayStartForSales);
      tomorrowStartForSales.setDate(todayStartForSales.getDate() + 1);

      const salesTodaySnapshot = await db.collection('sales_history')
                                          .where('companyId', '==', companyId)
                                          .where('date', '>=', AdminTimestamp.fromDate(todayStartForSales))
                                          .where('date', '<', AdminTimestamp.fromDate(tomorrowStartForSales))
                                          .where('deletedAt', '==', null)
                                          .get();
      console.log(`[Analytics Dashboard API] Fetched ${salesTodaySnapshot.docs.length} sales records for today.`);
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
        // turnoverRate would typically be calculated separately, not usually live on dashboard due to complexity
      };
      console.log(`[Analytics Dashboard API] KPIs from live calculation:`, kpis);
      return NextResponse.json({ data: kpis, source: 'live_calculation' });
    }
  } catch (error: any) {
    console.error(`[Analytics Dashboard API] UNHANDLED EXCEPTION for company ${companyId}:`, error);
    const errorMessage = `Internal server error processing dashboard analytics: ${error.message || 'Unknown error'}`;
    if (error.code === 'failed-precondition') {
        return NextResponse.json({ 
            error: 'A Firestore query failed, possibly due to a missing index. Please check server logs for a link to create the index.',
            details: error.message 
        }, { status: 500 });
    }
    return NextResponse.json({ error: errorMessage, details: error.stack }, { status: 500 });
  }
}

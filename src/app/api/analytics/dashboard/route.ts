
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb, isAdminInitialized, getInitializationError, admin } from '@/lib/firebase/admin';
import { verifyAuthToken, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument, OrderDocument, SalesHistoryDocument, DailyAggregateDocument } from '@/lib/types/firestore';

console.log('[API /api/analytics/dashboard/route.ts] File loaded by Next.js runtime.');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  console.log("[Analytics Dashboard API] Request received at entry point.");
  
  if (!isAdminInitialized()) {
    const initErrorMsg = getInitializationError(); 
    const detailedErrorMessage = `Firebase Admin SDK not initialized. ${initErrorMsg || 'Unknown initialization error.'}`;
    console.error(`[Analytics Dashboard API] AT ENTRY: ${detailedErrorMessage}`);
    return NextResponse.json({ error: `Server configuration error: ${detailedErrorMessage}`, details: initErrorMsg }, { status: 500 });
  }

  let user: VerifiedUser;
  try {
    user = await verifyAuthToken(request);
     if (!requireRole(user.role, 'viewer')) {
        return NextResponse.json({ error: 'Access denied. Viewer role or higher required.' }, { status: 403 });
    }
  } catch (authError: any) {
    console.error("[Analytics Dashboard API] Authentication failed:", authError.message);
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }
  
  const db = getDb();
  const { companyId } = user;
  console.log(`[Analytics Dashboard API] Authenticated for companyId: ${companyId}, userId: ${user.uid}`);

  try {
    // 1. Fetch from daily aggregate for base metrics
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const aggregateDocId = `${companyId}_${today.toISOString().split('T')[0]}`;
    const aggregateDoc = await db.collection('daily_aggregates').doc(aggregateDocId).get();

    let kpis: Partial<DashboardKPIs> = {};
    let source = 'live_calculation';

    if (aggregateDoc.exists) {
      source = 'daily_aggregate';
      const aggData = aggregateDoc.data() as DailyAggregateDocument;
      kpis = {
        totalInventoryValue: aggData.totalInventoryValue,
        lowStockItemsCount: aggData.lowStockItemsCount,
        outOfStockItemsCount: aggData.outOfStockItemsCount,
        todaysRevenue: aggData.todaysRevenue,
        inventoryValueByCategory: aggData.inventoryValueByCategory,
        turnoverRate: aggData.turnoverRate, // Assuming it's calculated in the job
        lastUpdated: (aggData.lastCalculated as admin.firestore.Timestamp).toDate().toISOString(),
      };
      console.log(`[Analytics Dashboard API] Loaded KPIs from aggregate doc ${aggregateDocId}`);
    } else {
      console.warn(`[Analytics Dashboard API] Daily aggregate doc ${aggregateDocId} not found. Calculating live.`);
      // Fallback to live calculation if aggregate is missing
      const inventorySnapshot = await db.collection('inventory').where('companyId', '==', companyId).where('deletedAt', '==', null).get();
      let totalInventoryValue = 0;
      let lowStockItemsCount = 0;
      let outOfStockItemsCount = 0;
      inventorySnapshot.forEach(doc => {
          const item = doc.data() as InventoryStockDocument;
          totalInventoryValue += (item.quantity || 0) * (item.unitCost || 0);
          if (item.reorderPoint && (item.quantity || 0) <= item.reorderPoint) lowStockItemsCount++;
          if ((item.quantity || 0) <= 0) outOfStockItemsCount++;
      });
      kpis.totalInventoryValue = totalInventoryValue;
      kpis.lowStockItemsCount = lowStockItemsCount;
      kpis.outOfStockItemsCount = outOfStockItemsCount;
      kpis.lastUpdated = new Date().toISOString();
    }

    // 2. Fetch live metrics that are not in the aggregate or need to be fresh
    const pendingOrdersSnapshot = await db.collection('orders')
      .where('companyId', '==', companyId)
      .where('deletedAt', '==', null)
      .where('status', 'in', ['pending', 'pending_approval', 'pending_payment', 'processing', 'awaiting_shipment', 'awaiting_delivery', 'partially_shipped'])
      .count()
      .get();
    kpis.pendingOrdersCount = pendingOrdersSnapshot.data().count;

    // 3. Recalculate turnover rate live if not in aggregate, using current inventory value
    if (kpis.turnoverRate === undefined && kpis.totalInventoryValue! > 0) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cogsSnapshot = await db.collection('sales_history').where('companyId', '==', companyId).where('deletedAt', '==', null).where('date', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo)).get();
      let totalCOGS = 0;
      cogsSnapshot.forEach(doc => { totalCOGS += (doc.data() as SalesHistoryDocument).costAtTimeOfSale || 0; });
      kpis.turnoverRate = parseFloat((totalCOGS / kpis.totalInventoryValue!).toFixed(2));
    }


    console.log(`[Analytics Dashboard API] Successfully fetched KPIs for company ${companyId}. Source: ${source}`);
    return NextResponse.json({ data: kpis as DashboardKPIs, source });

  } catch (error: any) {
    console.error(`[Analytics Dashboard API] Error fetching dashboard data for company ${companyId}. Error: ${error.message}`, error.stack);
    const errorMessage = `Internal server error during dashboard analytics: ${error.message || 'Unknown error'}`;
    return NextResponse.json({ error: errorMessage, details: error.stack ? error.stack.substring(0, 500) + "..." : "No stack trace available" }, { status: 500 });
  }
}

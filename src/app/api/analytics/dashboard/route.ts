
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, isAdminInitialized, getInitializationError, admin } from '@/lib/firebase/admin';
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
  console.log("[Analytics Dashboard API] Request received at entry point.");
  
  if (!isAdminInitialized()) {
    const initErrorMsg = getInitializationError(); 
    const detailedErrorMessage = `Firebase Admin SDK not initialized. Reason: ${initErrorMsg || 'Unknown initialization error. Please check server startup logs from admin.ts, especially for messages about service-account-key.json.'}`;
    console.error(`[Analytics Dashboard API] AT ENTRY: ${detailedErrorMessage}`);
    return NextResponse.json({ error: `Server configuration error: ${detailedErrorMessage}` }, { status: 500 });
  }

  const db = getDb();
  if (!db) {
    // This case should ideally be caught by isAdminInitialized if initErrorMsg is set properly.
    const initErrorMsg = getInitializationError(); 
    const detailedErrorMessage = `Firestore instance (db) is null. Reason: ${initErrorMsg || 'This usually means Admin SDK initialization failed critically earlier. Check server startup logs.'}`;
    console.error(`[Analytics Dashboard API] AFTER SDK INIT CHECK BUT DB IS NULL: ${detailedErrorMessage}`);
    return NextResponse.json({ error: `Server configuration error: ${detailedErrorMessage}` }, { status: 500 });
  }
  
  let companyId: string;
  let userId: string;
  try {
    const authResult = await verifyAuthToken(request); 
    companyId = authResult.companyId;
    userId = authResult.uid;
    console.log(`[Analytics Dashboard API] Authenticated successfully. User ID: ${userId}, Company ID: ${companyId}`);
  } catch (authError: any) {
    console.error("[Analytics Dashboard API] AUTHENTICATION ERROR:", authError.message, authError.stack);
    return NextResponse.json({ error: `Authentication failed: ${authError.message || 'Unknown auth error'}` }, { status: 401 });
  }

  if (!companyId) {
    console.error("[Analytics Dashboard API] CRITICAL: Company ID is undefined after successful-looking authentication. This should not happen.");
    return NextResponse.json({ error: "Company ID missing after authentication." }, { status: 500 });
  }
  console.log(`[Analytics Dashboard API] Processing dashboard request for companyId: ${companyId}`);

  try {
    const todayForAggId = new Date();
    todayForAggId.setUTCHours(0,0,0,0);
    const todayStr = todayForAggId.toISOString().split('T')[0];
    const aggregateDocId = `${companyId}_${todayStr}`;
    const aggregateDocRef = db.collection('daily_aggregates').doc(aggregateDocId);

    console.log(`[Analytics Dashboard API] Attempting to fetch aggregate document: ${aggregateDocId}`);
    const aggregateDocSnap = await aggregateDocRef.get();

    if (aggregateDocSnap.exists) {
      const aggData = aggregateDocSnap.data() as DailyAggregateDocument;
      console.log(`[Analytics Dashboard API] Aggregate document ${aggregateDocId} FOUND.`);

      const kpis: DashboardKPIs = {
        totalInventoryValue: typeof aggData.totalInventoryValue === 'number' ? aggData.totalInventoryValue : 0,
        lowStockItemsCount: typeof aggData.lowStockItemsCount === 'number' ? aggData.lowStockItemsCount : 0,
        outOfStockItemsCount: typeof aggData.outOfStockItemsCount === 'number' ? aggData.outOfStockItemsCount : 0,
        pendingOrdersCount: 0, 
        todaysRevenue: typeof aggData.todaysRevenue === 'number' ? aggData.todaysRevenue : 0,
        inventoryValueByCategory: aggData.inventoryValueByCategory || {},
        lastUpdated: (aggData.lastCalculated as admin.firestore.Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
        turnoverRate: typeof aggData.turnoverRate === 'number' ? aggData.turnoverRate : undefined,
      };

      const pendingOrdersSnapshot = await db.collection('orders')
                                          .where('companyId', '==', companyId)
                                          .where('type', '==', 'purchase')
                                          .where('status', 'in', ['pending', 'pending_approval', 'processing', 'awaiting_shipment'])
                                          .where('deletedAt', '==', null)
                                          .count()
                                          .get();
      kpis.pendingOrdersCount = pendingOrdersSnapshot.data().count;
      console.log(`[Analytics Dashboard API] KPIs from AGGREGATE (Pending Orders: ${kpis.pendingOrdersCount}):`, JSON.stringify(kpis).substring(0, 300) + "...");
      return NextResponse.json({ data: kpis, source: 'aggregate' });

    } else {
      console.warn(`[Analytics Dashboard API] Aggregate document ${aggregateDocId} NOT FOUND. Calculating live KPIs for company ${companyId}.`);
      console.time(`calculateLiveDashboardData-${companyId}`);

      const inventorySnapshot = await db.collection('inventory')
                                        .where('companyId', '==', companyId)
                                        .where('deletedAt', '==', null)
                                        .get();
      console.log(`[Analytics Dashboard API] Live Inventory: Fetched ${inventorySnapshot.docs.length} inventory items for company ${companyId}.`);

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
      console.log(`[Analytics Dashboard API] Live Inventory CALC: TotalValue=${totalInventoryValue.toFixed(2)}, LowStock=${lowStockItemsCount}, OutOfStock=${outOfStockItemsCount}`);

      const pendingStatuses: string[] = ['pending', 'pending_approval', 'processing', 'awaiting_shipment'];
      const pendingOrdersSnapshot = await db.collection('orders')
                                            .where('companyId', '==', companyId)
                                            .where('type', '==', 'purchase')
                                            .where('status', 'in', pendingStatuses)
                                            .where('deletedAt', '==', null)
                                            .count()
                                            .get();
      const pendingOrdersCount = pendingOrdersSnapshot.data().count;
      console.log(`[Analytics Dashboard API] Live Pending Orders: Fetched ${pendingOrdersCount} pending purchase orders.`);

      const todayStartForSales = new Date();
      todayStartForSales.setHours(0, 0, 0, 0);
      const tomorrowStartForSales = new Date(todayStartForSales);
      tomorrowStartForSales.setDate(todayStartForSales.getDate() + 1);

      const salesTodaySnapshot = await db.collection('sales_history')
                                          .where('companyId', '==', companyId)
                                          .where('date', '>=', admin.firestore.Timestamp.fromDate(todayStartForSales))
                                          .where('date', '<', admin.firestore.Timestamp.fromDate(tomorrowStartForSales))
                                          .where('deletedAt', '==', null)
                                          .get();
      let todaysRevenue = 0;
      salesTodaySnapshot.docs.forEach(doc => {
        const sale = doc.data() as SalesHistoryDocument;
        todaysRevenue += typeof sale.revenue === 'number' ? sale.revenue : 0;
      });
      console.log(`[Analytics Dashboard API] Live Today's Revenue: Fetched ${salesTodaySnapshot.docs.length} sales records, Revenue: ${todaysRevenue.toFixed(2)}.`);
      console.timeEnd(`calculateLiveDashboardData-${companyId}`);

      const kpis: DashboardKPIs = {
        totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
        lowStockItemsCount,
        outOfStockItemsCount,
        pendingOrdersCount,
        todaysRevenue: parseFloat(todaysRevenue.toFixed(2)),
        inventoryValueByCategory,
        lastUpdated: new Date().toISOString(),
      };
      console.log(`[Analytics Dashboard API] KPIs from LIVE CALCULATION:`, JSON.stringify(kpis).substring(0,300) + "...");
      return NextResponse.json({ data: kpis, source: 'live_calculation' });
    }
  } catch (error: any) {
    console.error(`[Analytics Dashboard API] UNHANDLED EXCEPTION for company ${companyId}. Error: ${error.message}`, error.stack);
    const errorMessage = `Internal server error during dashboard analytics: ${error.message || 'Unknown error'}`;
    if (error.code === 'failed-precondition' || (error.message && (error.message.includes("requires an index") || error.message.includes("Query requires an index")))) {
        console.error("[Analytics Dashboard API] Firestore missing index detected. Error message:", error.message);
        return NextResponse.json({
            error: 'A Firestore query failed due to a missing index. Please check server logs for a link to create the required index. This is a common issue that needs to be resolved in the Firebase console.',
            details: error.message
        }, { status: 500 });
    }
    return NextResponse.json({ error: errorMessage, details: error.stack ? error.stack.substring(0, 500) + "..." : "No stack trace available" }, { status: 500 });
  }
}

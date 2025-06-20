
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
  turnoverRate?: number; // Added this
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
  
  const db = getDb(); // getDb() will throw if adminInstance is still null or errored after re-init attempt
  const { companyId } = user;
  console.log(`[Analytics Dashboard API] Authenticated for companyId: ${companyId}, userId: ${user.uid}`);

  try {
    // 1. Inventory Metrics
    const inventorySnapshot = await db.collection('inventory')
      .where('companyId', '==', companyId)
      .where('deletedAt', '==', null)
      .get();
    
    let totalInventoryValue = 0;
    let lowStockItemsCount = 0;
    let outOfStockItemsCount = 0;
    const inventoryValueByCategory: Record<string, number> = {};

    inventorySnapshot.forEach(doc => {
      const item = doc.data() as InventoryStockDocument;
      const value = (item.quantity || 0) * (item.unitCost || 0);
      totalInventoryValue += value;
      if (item.reorderPoint && (item.quantity || 0) <= item.reorderPoint) {
        lowStockItemsCount++;
      }
      if ((item.quantity || 0) <= 0) {
        outOfStockItemsCount++;
      }
      if (item.category) {
        inventoryValueByCategory[item.category] = (inventoryValueByCategory[item.category] || 0) + value;
      }
    });

    // 2. Pending Orders
    const pendingOrdersSnapshot = await db.collection('orders')
      .where('companyId', '==', companyId)
      .where('deletedAt', '==', null)
      .where('status', 'in', ['pending', 'pending_approval', 'pending_payment', 'processing', 'awaiting_shipment', 'awaiting_delivery', 'partially_shipped'])
      .count()
      .get();
    const pendingOrdersCount = pendingOrdersSnapshot.data().count;

    // 3. Today's Revenue
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const salesTodaySnapshot = await db.collection('sales_history')
      .where('companyId', '==', companyId)
      .where('deletedAt', '==', null)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(todayStart))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
      .get();
    
    let todaysRevenue = 0;
    salesTodaySnapshot.forEach(doc => {
      const sale = doc.data() as SalesHistoryDocument;
      todaysRevenue += sale.revenue || 0;
    });

    // 4. Inventory Turnover Rate (Simplified: COGS last 90 days / Avg Inventory Value)
    // For simplicity, we'll use current inventory value as average for this example.
    // A more accurate calculation would average inventory over the period.
    let turnoverRate: number | undefined = undefined;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cogsSnapshot = await db.collection('sales_history')
      .where('companyId', '==', companyId)
      .where('deletedAt', '==', null)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
      .get();
    let totalCOGS = 0;
    cogsSnapshot.forEach(doc => {
        totalCOGS += (doc.data() as SalesHistoryDocument).costAtTimeOfSale || 0;
    });
    if (totalInventoryValue > 0) {
        turnoverRate = totalCOGS / totalInventoryValue;
    }


    const kpis: DashboardKPIs = {
      totalInventoryValue,
      lowStockItemsCount,
      outOfStockItemsCount,
      pendingOrdersCount,
      todaysRevenue,
      inventoryValueByCategory,
      turnoverRate: turnoverRate !== undefined ? parseFloat(turnoverRate.toFixed(2)) : undefined,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`[Analytics Dashboard API] Successfully fetched KPIs for company ${companyId}. Total Inventory Value: ${totalInventoryValue}`);
    return NextResponse.json({ data: kpis, source: 'live_data' });

  } catch (error: any) {
    console.error(`[Analytics Dashboard API] Error fetching dashboard data for company ${companyId}. Error: ${error.message}`, error.stack);
    const errorMessage = `Internal server error during dashboard analytics: ${error.message || 'Unknown error'}`;
    return NextResponse.json({ error: errorMessage, details: error.stack ? error.stack.substring(0, 500) + "..." : "No stack trace available" }, { status: 500 });
  }
}

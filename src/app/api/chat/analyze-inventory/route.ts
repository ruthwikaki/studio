
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { generateInventoryAnalysisReport, InventoryAnalysisReportInput, InventoryAnalysisReportOutput } from '@/ai/flows/inventoryAnalysisReport';
import type { InventoryStockDocument, SalesHistoryDocument } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Analyze Inventory] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Analyze Inventory] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const inventorySnapshot = await db.collection('inventory')
                                      .where('companyId', '==', companyId)
                                      .get();
    const inventoryItems = inventorySnapshot.docs.map(doc => doc.data() as InventoryStockDocument);

    if (inventoryItems.length === 0) {
      return NextResponse.json({ error: 'No inventory data found for this company to analyze.' }, { status: 404 });
    }

    const salesHistoryCutoffDate = new Date();
    salesHistoryCutoffDate.setDate(salesHistoryCutoffDate.getDate() - 180);

    const salesHistoryPerSku: Record<string, { date: string; quantitySold: number }[]> = {};
    const salesSnapshot = await db.collection('sales_history')
                                .where('companyId', '==', companyId)
                                .where('date', '>=', admin.firestore.Timestamp.fromDate(salesHistoryCutoffDate))
                                .get();
    
    salesSnapshot.docs.forEach(doc => {
      const sale = doc.data() as SalesHistoryDocument;
      if (!salesHistoryPerSku[sale.sku]) {
        salesHistoryPerSku[sale.sku] = [];
      }
      salesHistoryPerSku[sale.sku].push({
        date: (sale.date as admin.firestore.Timestamp).toDate().toISOString().split('T')[0],
        quantitySold: sale.quantity,
      });
    });
    
    const inventoryDataWithSales = inventoryItems.map(item => ({
        ...item,
        lastUpdated: item.lastUpdated ? (item.lastUpdated as admin.firestore.Timestamp).toDate().toISOString() : undefined,
        createdAt: item.createdAt ? (item.createdAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
        salesHistory: salesHistoryPerSku[item.sku] || [],
    }));

    const analysisInput: InventoryAnalysisReportInput = {
      inventoryData: JSON.stringify(inventoryDataWithSales),
    };

    const report: InventoryAnalysisReportOutput = await generateInventoryAnalysisReport(analysisInput);

    return NextResponse.json({ data: report });

  } catch (error: any) {
    console.error('Error generating inventory analysis report:', error);
    const message = error.message || 'Failed to generate inventory analysis report.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

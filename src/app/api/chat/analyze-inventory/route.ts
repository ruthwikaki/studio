
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { generateInventoryAnalysisReport, InventoryAnalysisReportInput, InventoryAnalysisReportOutput } from '@/ai/flows/inventoryAnalysisReport';
import type { InventoryStockDocument, SalesHistoryDocument, AdminTimestamp } from '@/lib/types/firestore';

export async function POST(request: NextRequest) {
  let companyId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    // 1. Fetch all inventory items for the company
    const inventorySnapshot = await db.collection('inventory')
                                      .where('companyId', '==', companyId)
                                      .get();
    const inventoryItems = inventorySnapshot.docs.map(doc => doc.data() as InventoryStockDocument);

    if (inventoryItems.length === 0) {
      return NextResponse.json({ error: 'No inventory data found for this company to analyze.' }, { status: 404 });
    }

    // 2. Fetch recent sales history for all items (e.g., last 180 days for dead stock analysis)
    // This can be a large fetch, so consider efficiency for very large datasets.
    // For simplicity here, we'll fetch and then associate with inventory items.
    const salesHistoryCutoffDate = new Date();
    salesHistoryCutoffDate.setDate(salesHistoryCutoffDate.getDate() - 180); // 180 days ago

    const salesHistoryPerSku: Record<string, { date: string; quantitySold: number }[]> = {};
    const salesSnapshot = await db.collection('sales_history')
                                .where('companyId', '==', companyId)
                                .where('date', '>=', salesHistoryCutoffDate)
                                .get();
    
    salesSnapshot.docs.forEach(doc => {
      const sale = doc.data() as SalesHistoryDocument;
      if (!salesHistoryPerSku[sale.sku]) {
        salesHistoryPerSku[sale.sku] = [];
      }
      salesHistoryPerSku[sale.sku].push({
        date: (sale.date as AdminTimestamp).toDate().toISOString().split('T')[0],
        quantitySold: sale.quantity,
      });
    });
    
    // Combine inventory data with its sales history for the AI flow
    const inventoryDataWithSales = inventoryItems.map(item => ({
        ...item,
        // Convert Timestamps for AI if they exist
        lastUpdated: item.lastUpdated ? (item.lastUpdated as AdminTimestamp).toDate().toISOString() : undefined,
        createdAt: item.createdAt ? (item.createdAt as AdminTimestamp).toDate().toISOString() : undefined,
        salesHistory: salesHistoryPerSku[item.sku] || [],
    }));


    const analysisInput: InventoryAnalysisReportInput = {
      inventoryData: JSON.stringify(inventoryDataWithSales),
    };

    const report: InventoryAnalysisReportOutput = await generateInventoryAnalysisReport(analysisInput);

    // Optionally, store the generated report in Firestore for historical tracking
    // For example, in an 'inventory_reports' collection:
    // await db.collection('inventory_reports').add({
    //   companyId,
    //   report,
    //   generatedAt: FieldValue.serverTimestamp(),
    // });

    return NextResponse.json({ data: report });

  } catch (error: any) {
    console.error('Error generating inventory analysis report:', error);
    const message = error.message || 'Failed to generate inventory analysis report.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

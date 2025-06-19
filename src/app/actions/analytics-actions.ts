
'use server';

import { db, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { verifyAuthTokenOnServerAction } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument, SalesHistoryDocument, AnalyticsDocument } from '@/lib/types/firestore';
import Papa from 'papaparse';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function generateDailyReport(): Promise<ActionResult<AnalyticsDocument>> {
  try {
    const { companyId, uid } = await verifyAuthTokenOnServerAction();

    // 1. Fetch necessary data
    const inventorySnapshot = await db.collection('inventory').where('companyId', '==', companyId).get();
    
    let totalInventoryValue = 0;
    let lowStockItemsCount = 0;
    let outOfStockItemsCount = 0;
    inventorySnapshot.docs.forEach(doc => {
      const item = doc.data() as InventoryStockDocument;
      totalInventoryValue += (item.quantity || 0) * (item.unitCost || 0);
      if (item.quantity <= item.reorderPoint && item.reorderPoint > 0) lowStockItemsCount++;
      if (item.quantity <= 0) outOfStockItemsCount++;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const salesTodaySnapshot = await db.collection('sales_history')
                                      .where('companyId', '==', companyId)
                                      .where('date', '>=', AdminTimestamp.fromDate(today))
                                      .where('date', '<', AdminTimestamp.fromDate(tomorrow))
                                      .get();
    let todaysRevenue = 0;
    salesTodaySnapshot.docs.forEach(doc => {
      todaysRevenue += (doc.data() as SalesHistoryDocument).revenue || 0;
    });

    const reportId = `daily_report_${companyId}_${today.toISOString().split('T')[0]}`;
    const reportData: Omit<AnalyticsDocument, 'id'> = {
      companyId,
      date: AdminTimestamp.fromDate(today),
      totalInventoryValue,
      lowStockItemsCount,
      outOfStockItemsCount,
      todaysRevenue,
      // turnoverRate and other complex metrics can be calculated and added here
      // For example, by calling calculateTurnoverRate
      lastCalculated: FieldValue.serverTimestamp() as AdminTimestamp,
      generatedBy: uid,
    };

    await db.collection('analytics_reports').doc(reportId).set(reportData, { merge: true });

    revalidatePath('/analytics'); // Revalidate analytics page if it shows daily reports
    return { success: true, data: { id: reportId, ...reportData } as AnalyticsDocument, message: "Daily report generated successfully." };
  } catch (e: any) {
    console.error("Error generating daily report:", e);
    return { success: false, error: e.message || 'Failed to generate daily report.' };
  }
}

export async function exportInventoryData(format: 'csv'): Promise<ActionResult<{ content: string; contentType: string; fileName: string }>> {
  try {
    const { companyId } = await verifyAuthTokenOnServerAction();

    const inventorySnapshot = await db.collection('inventory').where('companyId', '==', companyId).get();
    const itemsToExport = inventorySnapshot.docs.map(doc => {
      const data = doc.data() as InventoryStockDocument;
      // Select and format fields for export
      return {
        SKU: data.sku,
        Name: data.name,
        Category: data.category || '',
        Quantity: data.quantity,
        UnitCost: data.unitCost,
        ReorderPoint: data.reorderPoint,
        Location: data.location || '',
        LastUpdated: (data.lastUpdated as AdminTimestamp)?.toDate().toISOString() || '',
        Notes: data.notes || '',
      };
    });

    if (itemsToExport.length === 0) {
      return { success: false, error: 'No inventory data to export.' };
    }

    let content: string;
    let contentType: string;
    const fileName = `inventory_export_${companyId}_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'csv') {
      content = Papa.unparse(itemsToExport);
      contentType = 'text/csv';
    } else {
      return { success: false, error: 'Unsupported export format.' };
    }
    
    return { success: true, data: { content, contentType, fileName } };
  } catch (e: any) {
    console.error("Error exporting inventory data:", e);
    return { success: false, error: e.message || 'Failed to export inventory data.' };
  }
}


export async function calculateTurnoverRate(periodDays: number = 90): Promise<ActionResult<{ turnoverRate: number; cogs: number; avgInventoryValue: number }>> {
  try {
    const { companyId } = await verifyAuthTokenOnServerAction();

    // 1. Calculate COGS for the period
    const periodEndDate = new Date();
    const periodStartDate = new Date();
    periodStartDate.setDate(periodEndDate.getDate() - periodDays);

    const salesSnapshot = await db.collection('sales_history')
                                .where('companyId', '==', companyId)
                                .where('date', '>=', AdminTimestamp.fromDate(periodStartDate))
                                .where('date', '<=', AdminTimestamp.fromDate(periodEndDate))
                                .get();
    let cogs = 0;
    salesSnapshot.docs.forEach(doc => {
      cogs += (doc.data() as SalesHistoryDocument).costAtTimeOfSale || 0;
    });

    // 2. Calculate Average Inventory Value
    // This is a simplified average using current inventory value.
    // A more accurate method would use (BeginningInventory + EndingInventory) / 2,
    // requiring historical inventory snapshots.
    const inventorySnapshot = await db.collection('inventory').where('companyId', '==', companyId).get();
    let currentInventoryValue = 0;
    inventorySnapshot.docs.forEach(doc => {
      const item = doc.data() as InventoryStockDocument;
      currentInventoryValue += (item.quantity || 0) * (item.unitCost || 0);
    });
    
    // Simplified: using current inventory value as average for this example.
    // In a real scenario, you'd fetch/calculate beginning and ending inventory for the period.
    const avgInventoryValue = currentInventoryValue; 

    if (avgInventoryValue === 0) {
      return { success: false, error: 'Average inventory value is zero, cannot calculate turnover rate.' };
    }

    const turnoverRate = cogs / avgInventoryValue;

    return { 
      success: true, 
      data: { 
        turnoverRate: parseFloat(turnoverRate.toFixed(2)), // Rounded
        cogs, 
        avgInventoryValue 
      },
      message: `Inventory turnover rate calculated for the last ${periodDays} days.`
    };

  } catch (e: any)
 {
    console.error("Error calculating turnover rate:", e);
    return { success: false, error: e.message || 'Failed to calculate turnover rate.' };
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { optimizeReorders, OptimizeReordersInput, OptimizeReordersOutput } from '@/ai/flows/reorderOptimization';
import type { InventoryStockDocument, SalesHistoryDocument, SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    // 1. Fetch current inventory for the company
    const inventorySnapshot = await db.collection('inventory').where('companyId', '==', companyId).get();
    const currentInventory = inventorySnapshot.docs.map(doc => {
      const data = doc.data() as InventoryStockDocument;
      // Select relevant fields for the AI flow input
      return { 
        sku: data.sku, 
        name: data.name, 
        quantity: data.quantity, 
        unitCost: data.unitCost, 
        reorderPoint: data.reorderPoint,
        category: data.category,
        // Any other fields the `optimizeReorders` flow might find useful
      };
    });

    if (currentInventory.length === 0) {
      return NextResponse.json({ data: { recommendations: [] }, message: "No inventory items found to generate suggestions." });
    }

    // 2. Fetch historical demand (Simplified: total sales in last 90 days per product)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const historicalDemandMap: Record<string, { sku: string; salesHistory: { date: string; quantitySold: number }[] }> = {};

    for (const item of currentInventory) {
      const salesSnapshot = await db.collection('sales_history')
        .where('companyId', '==', companyId)
        .where('sku', '==', item.sku)
        .where('date', '>=', ninetyDaysAgo)
        .get();
      
      const salesHistory = salesSnapshot.docs.map(doc => {
        const sale = doc.data() as SalesHistoryDocument;
        return {
          date: (sale.date as AdminTimestamp).toDate().toISOString().split('T')[0],
          quantitySold: sale.quantity,
        };
      });
      if (salesHistory.length > 0) {
        historicalDemandMap[item.sku] = { sku: item.sku, salesHistory };
      }
    }
    const historicalDemand = Object.values(historicalDemandMap);

    // 3. Fetch supplier lead times and discount info
    const suppliersSnapshot = await db.collection('suppliers').where('companyId', '==', companyId).get();
    const supplierLeadTimes: { sku: string; supplierId: string; leadTimeDays: number }[] = [];
    const bulkDiscountThresholds: any[] = []; // Define a proper type if schema supports it

    suppliersSnapshot.docs.forEach(doc => {
      const supplier = doc.data() as SupplierDocument;
      if (supplier.productsSupplied) {
        supplier.productsSupplied.forEach((product: SupplierProductInfo) => {
          if (product.sku && supplier.leadTimeDays !== undefined) {
            supplierLeadTimes.push({
              sku: product.sku,
              supplierId: supplier.id,
              leadTimeDays: supplier.leadTimeDays,
            });
          }
          // Example for bulk discounts - assuming a structure
          // if (supplier.discounts && supplier.discounts[product.sku]) {
          //   bulkDiscountThresholds.push({ supplierId: supplier.id, sku: product.sku, thresholds: supplier.discounts[product.sku] });
          // }
        });
      }
    });

    const reorderInput: OptimizeReordersInput = {
      currentInventory: JSON.stringify(currentInventory),
      historicalDemand: JSON.stringify(historicalDemand),
      supplierLeadTimes: JSON.stringify(supplierLeadTimes),
      bulkDiscountThresholds: bulkDiscountThresholds.length > 0 ? JSON.stringify(bulkDiscountThresholds) : undefined,
      // cashFlowConstraints: "Optional cash flow constraints description", // Example
    };

    const recommendations: OptimizeReordersOutput = await optimizeReorders(reorderInput);

    return NextResponse.json({ data: recommendations });
  } catch (error: any) {
    console.error('Error generating reorder suggestions:', error);
    const message = error.message || 'Failed to generate reorder suggestions.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

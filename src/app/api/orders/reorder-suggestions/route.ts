
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { optimizeReorders, OptimizeReordersInput, OptimizeReordersOutput } from '@/ai/flows/reorderOptimization';
import type { InventoryStockDocument, SalesHistoryDocument, SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

export async function GET(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Reorder Suggestions] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Reorder Suggestions] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const inventorySnapshot = await db.collection('inventory').where('companyId', '==', companyId).where('deletedAt', '==', null).get();
    const currentInventory = inventorySnapshot.docs.map(doc => {
      const data = doc.data() as InventoryStockDocument;
      return { 
        sku: data.sku, name: data.name, quantity: data.quantity, 
        unitCost: data.unitCost, reorderPoint: data.reorderPoint, category: data.category,
      };
    });

    if (currentInventory.length === 0) {
      return NextResponse.json({ data: { recommendations: [] }, message: "No inventory items found to generate suggestions." });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const historicalDemandMap: Record<string, { sku: string; salesHistory: { date: string; quantitySold: number }[] }> = {};

    for (const item of currentInventory) {
      const salesSnapshot = await db.collection('sales_history')
        .where('companyId', '==', companyId)
        .where('sku', '==', item.sku)
        .where('date', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
        .get();
      
      const salesHistory = salesSnapshot.docs.map(doc => {
        const sale = doc.data() as SalesHistoryDocument;
        return {
          date: (sale.date as admin.firestore.Timestamp).toDate().toISOString().split('T')[0],
          quantitySold: sale.quantity,
        };
      });
      if (salesHistory.length > 0) {
        historicalDemandMap[item.sku] = { sku: item.sku, salesHistory };
      }
    }
    const historicalDemand = Object.values(historicalDemandMap);

    const suppliersSnapshot = await db.collection('suppliers').where('companyId', '==', companyId).where('deletedAt', '==', null).get();
    const supplierLeadTimes: { sku: string; supplierId: string; leadTimeDays: number }[] = [];
    const bulkDiscountThresholds: any[] = [];

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
        });
      }
    });

    const reorderInput: OptimizeReordersInput = {
      currentInventory: JSON.stringify(currentInventory),
      historicalDemand: JSON.stringify(historicalDemand),
      supplierLeadTimes: JSON.stringify(supplierLeadTimes),
      bulkDiscountThresholds: bulkDiscountThresholds.length > 0 ? JSON.stringify(bulkDiscountThresholds) : undefined,
    };

    const recommendations: OptimizeReordersOutput = await optimizeReorders(reorderInput);

    return NextResponse.json({ data: recommendations });
  } catch (error: any) {
    console.error('Error generating reorder suggestions:', error);
    const message = error.message || 'Failed to generate reorder suggestions.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

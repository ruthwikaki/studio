
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument, SalesHistoryDocument } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const DEFAULT_LEAD_TIME_DAYS = 14;
const DEFAULT_SAFETY_STOCK_DAYS = 7;
const SALES_HISTORY_PERIOD_DAYS = 90;

export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Calc Reorder] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Calc Reorder] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed.' }, { status: 401 });
  }

  try {
    const inventorySnapshot = await db.collection('inventory')
                                      .where('companyId', '==', companyId)
                                      .where('deletedAt', '==', null)
                                      .get();

    if (inventorySnapshot.empty) {
      return NextResponse.json({ message: 'No inventory items found for this company to calculate reorder points.' }, { status: 200 });
    }

    const batch = db.batch();
    const updatedItemsLog: { sku: string; oldReorderPoint: number; newReorderPoint: number; reason?: string }[] = [];
    const ninetyDaysAgoDate = new Date();
    ninetyDaysAgoDate.setDate(ninetyDaysAgoDate.getDate() - SALES_HISTORY_PERIOD_DAYS);
    
    for (const doc of inventorySnapshot.docs) {
      const item = { id: doc.id, ...doc.data() } as InventoryStockDocument;

      const salesHistoryQuery = await db.collection('sales_history')
                                        .where('companyId', '==', companyId)
                                        .where('productId', '==', item.productId)
                                        .where('date', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgoDate))
                                        .orderBy('date')
                                        .get();
      
      let totalQuantitySold = 0;
      salesHistoryQuery.docs.forEach(shDoc => {
        const sale = shDoc.data() as SalesHistoryDocument;
        totalQuantitySold += sale.quantity;
      });

      if (salesHistoryQuery.empty || totalQuantitySold === 0) {
        updatedItemsLog.push({ 
            sku: item.sku, 
            oldReorderPoint: item.reorderPoint, 
            newReorderPoint: item.reorderPoint, 
            reason: 'No sales history in the last 90 days or zero sales.' 
        });
        continue;
      }
      
      const firstSaleDate = (salesHistoryQuery.docs[0].data().date as admin.firestore.Timestamp).toDate();
      const lastSaleDate = (salesHistoryQuery.docs[salesHistoryQuery.docs.length -1].data().date as admin.firestore.Timestamp).toDate();
      const effectiveDays = Math.max(1, (lastSaleDate.getTime() - firstSaleDate.getTime()) / (1000 * 3600 * 24)) || SALES_HISTORY_PERIOD_DAYS;

      const avgDailyUsage = totalQuantitySold / Math.min(effectiveDays, SALES_HISTORY_PERIOD_DAYS);
      
      const leadTime = item.leadTimeDays || DEFAULT_LEAD_TIME_DAYS;
      const safetyStock = avgDailyUsage * DEFAULT_SAFETY_STOCK_DAYS;
      const newReorderPoint = Math.ceil((avgDailyUsage * leadTime) + safetyStock);

      if (newReorderPoint !== item.reorderPoint) {
        const itemRef = db.collection('inventory').doc(item.id);
        batch.update(itemRef, { 
            reorderPoint: newReorderPoint,
            lastUpdated: FieldValue.serverTimestamp(),
            lastUpdatedBy: userId,
        });
        updatedItemsLog.push({ sku: item.sku, oldReorderPoint: item.reorderPoint, newReorderPoint });
      } else {
         updatedItemsLog.push({ 
            sku: item.sku, 
            oldReorderPoint: item.reorderPoint, 
            newReorderPoint: item.reorderPoint,
            reason: 'Calculated reorder point is the same as current.'
        });
      }
    }

    if (updatedItemsLog.some(log => log.newReorderPoint !== log.oldReorderPoint && log.reason === undefined)) {
        await batch.commit();
        return NextResponse.json({ message: 'Reorder points calculated and updated.', details: updatedItemsLog }, { status: 200 });
    } else {
        return NextResponse.json({ message: 'Reorder points calculation complete. No updates were necessary.', details: updatedItemsLog }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Error calculating reorder points:', error);
    const message = error.message || 'Failed to calculate reorder points.';
     if (error.code === 'MODULE_NOT_FOUND' || (error.message && error.message.includes("Service account key not found"))) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


'use server';

import { getDb, FieldValue, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthTokenOnServerAction } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export async function quickUpdateQuantity(sku: string, newQuantity: number): Promise<ActionResult> {
  if (!isAdminInitialized()) {
    return { success: false, error: "Server configuration error (Admin SDK not initialized)." };
  }
  const db = getDb();
  if (!db) {
    return { success: false, error: "Server configuration error (Firestore not available)." };
  }
  try {
    const { companyId, uid } = await verifyAuthTokenOnServerAction();
    if (newQuantity < 0) {
      return { success: false, error: 'Quantity cannot be negative.' };
    }

    const inventoryQuery = await db.collection('inventory')
                                   .where('companyId', '==', companyId)
                                   .where('sku', '==', sku)
                                   .limit(1)
                                   .get();

    if (inventoryQuery.empty) {
      return { success: false, error: `Item with SKU ${sku} not found for your company.` };
    }

    const itemRef = inventoryQuery.docs[0].ref;
    await itemRef.update({
      quantity: newQuantity,
      lastUpdated: FieldValue.serverTimestamp(),
      lastUpdatedBy: uid,
    });

    revalidatePath('/inventory');
    return { success: true };
  } catch (e: any) {
    console.error("Error in quickUpdateQuantity:", e);
    return { success: false, error: e.message || 'Failed to update quantity.' };
  }
}

export async function bulkUpdateItems(updates: { sku: string; data: Partial<Omit<InventoryStockDocument, 'id' | 'companyId' | 'lastUpdated' | 'createdAt' | 'createdBy' | 'lastUpdatedBy'>> }[]): Promise<ActionResult> {
  if (!isAdminInitialized()) {
    return { success: false, error: "Server configuration error (Admin SDK not initialized)." };
  }
  const db = getDb();
  if (!db) {
    return { success: false, error: "Server configuration error (Firestore not available)." };
  }
  try {
    const { companyId, uid } = await verifyAuthTokenOnServerAction();
    if (!updates || updates.length === 0) {
      return { success: false, error: 'No updates provided.' };
    }
    if (updates.length > 500) {
        return { success: false, error: 'Too many items to update at once (max 500).' };
    }

    const batch = db.batch();
    const notFoundSkus: string[] = [];

    for (const update of updates) {
      const inventoryQuery = await db.collection('inventory')
                                     .where('companyId', '==', companyId)
                                     .where('sku', '==', update.sku)
                                     .limit(1)
                                     .get();
      if (!inventoryQuery.empty) {
        const itemRef = inventoryQuery.docs[0].ref;
        batch.update(itemRef, { 
            ...update.data, 
            lastUpdated: FieldValue.serverTimestamp(),
            lastUpdatedBy: uid 
        });
      } else {
        notFoundSkus.push(update.sku);
      }
    }
    
    if (notFoundSkus.length > 0) {
        console.warn(`Bulk update: SKUs not found for company ${companyId}: ${notFoundSkus.join(', ')}`);
    }
    
    await batch.commit();

    revalidatePath('/inventory');
    return { success: true, details: notFoundSkus.length > 0 ? { notFoundSkus } : undefined };
  } catch (e: any) {
    console.error("Error in bulkUpdateItems:", e);
    return { success: false, error: e.message || 'Failed to bulk update items.' };
  }
}

export async function deleteItems(skus: string[]): Promise<ActionResult> {
  if (!isAdminInitialized()) {
    return { success: false, error: "Server configuration error (Admin SDK not initialized)." };
  }
  const db = getDb();
  if (!db) {
    return { success: false, error: "Server configuration error (Firestore not available)." };
  }
  try {
    const { companyId } = await verifyAuthTokenOnServerAction();
    if (!skus || skus.length === 0) {
      return { success: false, error: 'No SKUs provided for deletion.' };
    }
     if (skus.length > 500) {
        return { success: false, error: 'Too many items to delete at once (max 500).' };
    }

    const batch = db.batch();
    const notFoundSkus: string[] = [];

    for (const sku of skus) {
      const inventoryQuery = await db.collection('inventory')
                                     .where('companyId', '==', companyId)
                                     .where('sku', '==', sku)
                                     .limit(1)
                                     .get();
      if (!inventoryQuery.empty) {
        const itemRef = inventoryQuery.docs[0].ref;
        batch.delete(itemRef); // This is a hard delete. Soft delete would be itemRef.update({ deletedAt: FieldValue.serverTimestamp() })
      } else {
        notFoundSkus.push(sku);
      }
    }

    if (notFoundSkus.length > 0) {
        console.warn(`Delete items: SKUs not found for company ${companyId}: ${notFoundSkus.join(', ')}`);
    }

    await batch.commit();
    
    revalidatePath('/inventory');
    return { success: true, details: notFoundSkus.length > 0 ? { notFoundSkus } : undefined };
  } catch (e: any) {
    console.error("Error in deleteItems:", e);
    return { success: false, error: e.message || 'Failed to delete items.' };
  }
}


// This is an alternative way to structure action-specific routes if preferred
// For now, DELETE on /api/inventory/[sku] handles soft delete.
// This file can be removed if the current structure is kept.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { logActivity } from '@/lib/activityLog';

export const POST = withAuth(async (request: NextRequest, { params }: { params: { sku: string } }, user: VerifiedUser) => {
  if (!requireRole(user.role, 'admin')) { // Only admins can soft delete
    return NextResponse.json({ error: 'Access denied. Requires admin role.' }, { status: 403 });
  }
  const { companyId, uid } = user;
  const skuParam = params.sku;

  if (!skuParam) {
    return NextResponse.json({ error: 'SKU parameter is required.' }, { status: 400 });
  }

  try {
    const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', skuParam)
                                  .where('deletedAt', '==', null) // Ensure it's not already soft-deleted
                                  .limit(1)
                                  .get();
    
    if (inventoryQuery.empty) {
      return NextResponse.json({ error: `Inventory item with SKU ${skuParam} not found or already deleted.` }, { status: 404 });
    }

    const itemDocRef = inventoryQuery.docs[0].ref;
    const itemData = inventoryQuery.docs[0].data() as InventoryStockDocument;
    
    await itemDocRef.update({
      deletedAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
      lastUpdatedBy: uid,
    });

    await logActivity({
        user,
        actionType: 'item_soft_deleted',
        resourceType: 'inventory',
        resourceId: itemDocRef.id,
        description: `Soft deleted item ${itemData.name} (SKU: ${skuParam}).`,
        details: { sku: skuParam, name: itemData.name }
    });

    return NextResponse.json({ message: `Item ${skuParam} soft deleted successfully.` });

  } catch (error: any) {
    console.error(`Error soft deleting inventory item ${params.sku}:`, error);
    const message = error.message || `Failed to soft delete item ${params.sku}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

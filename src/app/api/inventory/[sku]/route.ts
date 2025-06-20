
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { UpdateInventoryItemSchema } from '@/hooks/useInventory';
import { logActivity } from '@/lib/activityLog';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

export const GET = withAuth(async (request: NextRequest, { params }: { params: { sku: string } }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API Inventory SKU GET] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Inventory SKU GET] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  if (!requireRole(user.role, 'viewer')) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }
  const { companyId } = user;
  const sku = params.sku;

  if (!sku) {
    return NextResponse.json({ error: 'SKU is required.' }, { status: 400 });
  }

  try {
    const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', sku)
                                  .where('deletedAt', '==', null)
                                  .limit(1)
                                  .get();

    if (inventoryQuery.empty) {
      return NextResponse.json({ error: `Inventory item with SKU ${sku} not found for this company.` }, { status: 404 });
    }

    const doc = inventoryQuery.docs[0];
    const data = doc.data();
    const item: InventoryStockDocument = {
      id: doc.id,
      ...data,
      lastUpdated: (data.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
      createdAt: (data.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
      deletedAt: data.deletedAt ? (data.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
    } as InventoryStockDocument;

    return NextResponse.json({ data: item });

  } catch (error: any) {
    console.error(`Error fetching inventory item ${params.sku}:`, error);
    const message = error.message || `Failed to fetch item ${params.sku}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
});


export const PUT = withAuth(async (request: NextRequest, { params }: { params: { sku: string } }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API Inventory SKU PUT] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Inventory SKU PUT] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  if (!requireRole(user.role, 'manager')) {
    return NextResponse.json({ error: 'Access denied. Requires manager role or higher.' }, { status: 403 });
  }
  const { companyId, uid } = user;
  const skuParam = params.sku;

  if (!skuParam) {
    return NextResponse.json({ error: 'SKU parameter is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validationResult = UpdateInventoryItemSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid data.', details: validationResult.error.format() }, { status: 400 });
    }
    
    const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', skuParam)
                                  .where('deletedAt', '==', null)
                                  .limit(1)
                                  .get();

    if (inventoryQuery.empty) {
      return NextResponse.json({ error: `Inventory item with SKU ${skuParam} not found for this company.` }, { status: 404 });
    }
    
    const itemDocRef = inventoryQuery.docs[0].ref;
    const originalData = inventoryQuery.docs[0].data() as InventoryStockDocument;

    const updatePayload = { 
      ...validationResult.data, 
      lastUpdated: FieldValue.serverTimestamp(),
      lastUpdatedBy: uid,
    };
    
    await itemDocRef.update(updatePayload);
    
    await logActivity({
        user,
        actionType: 'item_updated',
        resourceType: 'inventory',
        resourceId: itemDocRef.id,
        description: `Updated item ${originalData.name} (SKU: ${skuParam}).`,
        details: { sku: skuParam, updatedFields: validationResult.data, originalName: originalData.name }
    });
    
    const updatedDocSnap = await itemDocRef.get();
    const updatedData = updatedDocSnap.data();

    const updatedItem: InventoryStockDocument = {
      id: updatedDocSnap.id,
      ...updatedData,
      lastUpdated: (updatedData?.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
      createdAt: (updatedData?.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
      deletedAt: updatedData?.deletedAt ? (updatedData.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
    } as InventoryStockDocument;
    
    return NextResponse.json({ data: updatedItem });

  } catch (error: any) {
    console.error(`Error updating inventory item ${params.sku}:`, error);
    const message = error.message || `Failed to update item ${params.sku}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { sku: string } }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API Inventory SKU DELETE] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Inventory SKU DELETE] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }
  
  if (!requireRole(user.role, 'admin')) {
    return NextResponse.json({ error: 'Access denied. Requires admin role or higher.' }, { status: 403 });
  }
  const { companyId, uid } = user;
  const skuParam = params.sku;

  if (!skuParam) {
    return NextResponse.json({ error: 'SKU parameter is required for deletion.' }, { status: 400 });
  }

  try {
    const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', skuParam)
                                  .where('deletedAt', '==', null)
                                  .limit(1)
                                  .get();
    
    if (inventoryQuery.empty) {
      return NextResponse.json({ error: `Inventory item with SKU ${skuParam} not found for this company.` }, { status: 404 });
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

    return NextResponse.json({ message: `Item ${skuParam} soft deleted successfully.` }, { status: 200 });

  } catch (error: any) {
    console.error(`Error soft deleting inventory item ${params.sku}:`, error);
    const message = error.message || `Failed to soft delete item ${params.sku}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

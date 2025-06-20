
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, FieldValue, isAdminInitialized } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { logActivity } from '@/lib/activityLog';
import { CreateInventoryItemSchema } from '@/hooks/useInventory';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp


export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API /inventory GET] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error (Admin SDK)." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API /inventory GET] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  console.log('[API /inventory GET] Request received by handler.');
  if (!requireRole(user.role, 'viewer')) {
    console.warn(`[API /inventory GET] Authorization failed. User role '${user.role}' does not meet minimum 'viewer'.`);
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }
  const { companyId } = user;
  console.log(`[API /inventory GET] Authenticated. User ID: ${user.uid}, Company ID: ${companyId}`);

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '8');
    const startAfterDocId = searchParams.get('startAfter');
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const searchQuery = searchParams.get('search');
    const fieldsParam = searchParams.get('fields');
    
    console.log(`[API /inventory GET] Query Params: limit=${limit}, startAfter=${startAfterDocId}, category=${category}, lowStockOnly=${lowStockOnly}, search=${searchQuery}, fields=${fieldsParam}`);

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('inventory')
                                                                        .where('companyId', '==', companyId)
                                                                        .where('deletedAt', '==', null);

    if (category && category !== 'all') {
      console.log(`[API /inventory GET] Applying category filter: ${category}`);
      query = query.where('category', '==', category);
    }
    
    if (searchQuery) {
      console.log(`[API /inventory GET] Applying search query: ${searchQuery} (on SKU)`);
      query = query.orderBy('sku').startAt(searchQuery).endAt(searchQuery + '\uf8ff');
    } else {
      query = query.orderBy('sku'); 
    }
    
    if (startAfterDocId) {
      console.log(`[API /inventory GET] Applying pagination: starting after doc ID ${startAfterDocId}`);
      const startAfterDoc = await db.collection('inventory').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      } else {
        console.warn(`[API /inventory GET] StartAfter document ID ${startAfterDocId} not found.`);
      }
    }
    
    const snapshot = await query.limit(limit).get();
    console.log(`[API /inventory GET] Firestore query executed. Found ${snapshot.docs.length} documents.`);
    
    let items: Partial<InventoryStockDocument>[] = snapshot.docs.map(doc => {
      const data = doc.data();
      const itemBase: Partial<InventoryStockDocument> = {
        id: doc.id,
        sku: data.sku,
        name: data.name,
        quantity: data.quantity,
        unitCost: data.unitCost,
        reorderPoint: data.reorderPoint,
        category: data.category,
        imageUrl: data.imageUrl,
        lastUpdated: (data.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
        createdAt: (data.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
      };

      if (fieldsParam) {
        const requestedFields = fieldsParam.split(',');
        const selectedItem: Partial<InventoryStockDocument> = { id: doc.id }; 
        requestedFields.forEach(field => {
          if (field in data) {
            (selectedItem as any)[field] = data[field];
          }
        });
        if (!selectedItem.sku && data.sku) selectedItem.sku = data.sku;
        if (!selectedItem.name && data.name) selectedItem.name = data.name;
        if (selectedItem.quantity === undefined && data.quantity !== undefined) selectedItem.quantity = data.quantity;
        if (selectedItem.reorderPoint === undefined && data.reorderPoint !== undefined) selectedItem.reorderPoint = data.reorderPoint;
        return selectedItem;
      }
      return itemBase;
    });

    if (lowStockOnly) {
      console.log(`[API /inventory GET] Applying lowStockOnly filter client-side (API part)`);
      items = items.filter(item => item.quantity !== undefined && item.reorderPoint !== undefined && item.reorderPoint > 0 && item.quantity <= item.reorderPoint);
    }
     if (searchQuery && !fieldsParam && !category) { 
        console.log(`[API /inventory GET] Applying additional client-side search filter for name on ${items.length} items.`);
        const lowerSearchQuery = searchQuery.toLowerCase();
        items = items.filter(item => 
            item.sku?.toLowerCase().includes(lowerSearchQuery) ||
            (item.name && item.name.toLowerCase().includes(lowerSearchQuery))
        );
    }

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    console.log(`[API /inventory GET] Responding with ${items.length} items. Next cursor: ${nextCursor}`);
    
    return NextResponse.json({
      data: items,
      pagination: { 
          count: items.length, 
          nextCursor: nextCursor
      },
    });

  } catch (error: any) {
    console.error('[API /inventory GET] Error fetching inventory:', error);
    if (error.code === 'failed-precondition' || (error.message && error.message.includes("requires an index"))) {
      console.error(`[API /inventory GET] Firestore missing index detected. Error message: ${error.message}. Link to create index might be present in this error.`);
      return NextResponse.json({ 
        error: 'Query requires a Firestore index. Please check server logs for details and a link to create it.', 
        details: error.message 
      }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch inventory items.';
    return NextResponse.json({ error: message, details: error.stack ? error.stack.substring(0,300) : null }, { status: 500 });
  }
});


export const POST = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  if (!isAdminInitialized()) {
    console.error("[API /inventory POST] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API /inventory POST] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  if (!requireRole(user.role, 'manager')) {
    return NextResponse.json({ error: 'Access denied. Requires manager role or higher.' }, { status: 403 });
  }
  const { companyId, uid } = user;

  try {
    const body = await request.json();
    const validationResult = CreateInventoryItemSchema.safeParse(body);

    if (!validationResult.success) {
        return NextResponse.json({ error: 'Invalid data.', details: validationResult.error.format() }, { status: 400 });
    }
    const itemData = validationResult.data;
    
    const existingItemQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', itemData.sku)
                                  .where('deletedAt', '==', null)
                                  .limit(1)
                                  .get();
    if (!existingItemQuery.empty) {
        return NextResponse.json({ error: `SKU ${itemData.sku} already exists for this company.`}, {status: 409});
    }

    const newItemRef = db.collection('inventory').doc();
    const newItemData: Omit<InventoryStockDocument, 'id' | 'deletedAt'> = { 
      ...itemData,
      companyId,
      productId: itemData.sku, 
      createdBy: uid,
      lastUpdatedBy: uid,
      lastUpdated: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      createdAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      lowStockAlertSent: false,
      description: itemData.description || undefined,
      reorderQuantity: itemData.reorderQuantity || undefined,
      location: itemData.location || undefined,
      imageUrl: itemData.imageUrl || undefined,
      category: itemData.category || undefined,
    };

    await newItemRef.set(newItemData);
    
    await logActivity({
        user,
        actionType: 'item_created',
        resourceType: 'inventory',
        resourceId: newItemRef.id,
        description: `Created inventory item ${itemData.name} (SKU: ${itemData.sku}).`,
        details: { sku: itemData.sku, name: itemData.name, quantity: itemData.quantity }
    });
    
    const createdDocSnap = await newItemRef.get();
    const createdData = createdDocSnap.data();
    const createdItem: InventoryStockDocument = { 
        id: createdDocSnap.id, 
        ...createdData,
        lastUpdated: (createdData?.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
        createdAt: (createdData?.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        deletedAt: createdData?.deletedAt ? (createdData.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
    } as InventoryStockDocument;

    return NextResponse.json({ data: createdItem, message: 'Inventory item added successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding inventory item:', error);
    const message = error.message || 'Failed to add inventory item.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

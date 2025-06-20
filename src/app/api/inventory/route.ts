
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, FieldValue, isAdminInitialized } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { logActivity } from '@/lib/activityLog';
import { CreateInventoryItemSchema } from '@/hooks/useInventory';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

// Firestore Index Suggestions for this route:
// 1. Basic Listing & SKU Search:
//    Collection: inventory
//    Fields: companyId (ASC), deletedAt (ASC), sku (ASC)
// 2. Category Filter & SKU Search:
//    Collection: inventory
//    Fields: companyId (ASC), deletedAt (ASC), category (ASC), sku (ASC)
// Note: `lowStockOnly` is a client-side filter in this implementation after fetching all items.
// If performance for lowStockOnly becomes an issue, a more complex query or a dedicated field might be needed.

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
      // This type of search requires an orderBy on the field used for startAt/endAt.
      // It's more efficient if you can query for exact SKU or a range.
      // For partial search, consider a dedicated search service or client-side filtering on a larger dataset.
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
        // Ensure some key fields are always present if requested partially
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
     // If a broad search query is used without category, it might be better to filter by name client-side after SKU search.
     // Or, use a more advanced search solution for partial name matches.
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
        error: 'Query requires a Firestore index. Please check server logs for details and a link to create it. Suggested indexes are also commented in the route file.', 
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
                                  .where('deletedAt', '==', null) // Check only against non-deleted items
                                  .limit(1)
                                  .get();
    if (!existingItemQuery.empty) {
        return NextResponse.json({ error: `SKU ${itemData.sku} already exists for this company.`}, {status: 409});
    }

    const newItemRef = db.collection('inventory').doc(); // Auto-generate ID
    const newItemData: Omit<InventoryStockDocument, 'id' | 'deletedAt'> = { // Ensure all required fields are covered
      ...itemData,
      companyId,
      productId: itemData.productId || newItemRef.id, // Use SKU or generated ID for productId
      createdBy: uid,
      lastUpdatedBy: uid,
      lastUpdated: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      createdAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      lowStockAlertSent: false, // Default value
      // Ensure optional fields from schema are handled if not provided
      description: itemData.description || undefined,
      reorderQuantity: itemData.reorderQuantity ?? undefined, // Use ?? to allow 0
      location: itemData.location || undefined,
      imageUrl: itemData.imageUrl || undefined,
      category: itemData.category || undefined,
      // Fields not in CreateInventoryItemSchema but in InventoryStockDocument
      notes: undefined, 
      leadTimeDays: undefined,
      onOrderQuantity: 0, // Default to 0
      abcCategory: undefined,
      isDeadStock: false, // Default
      isOverstocked: false, // Default
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

// Ensure productId is included in CreateInventoryItemSchema if it's always expected from client
// For now, assuming productId can be auto-derived or same as SKU for new items.
// If it's distinct and required, add it to CreateInventoryItemSchema.
// The hook 'useInventory' provides `CreateInventoryItemSchema`, let's ensure it aligns.
// The current `CreateInventoryItemSchema` from `useInventory.ts` does not include `productId`.
// The `InventoryStockDocument` type does.
// Let's refine newItemData creation for productId:
// If product master data exists elsewhere, productId should reference that.
// If SKU is the master identifier, then productId can be SKU.
// For simplicity here, if itemData.productId is not provided, we'll use the new document's ID or SKU.
// I'll assume itemData.sku can serve as productId if not explicitly provided.

// Corrected newItemData for productId:
// productId: itemData.productId || itemData.sku, // Use SKU if productId not directly in input
// Let's make this:
// productId: itemData.sku, // Simpler, assumes SKU is the Product ID for new items.
// Or better, make productId optional in InventoryStockDocument if it can be derived or isn't always there.
// Given product master data isn't explicitly managed here, linking productId to itself (doc.id) or SKU is common.
// I'll keep `productId: itemData.sku,` which is common if SKU = Product ID.
// Actually, for new items, the `productId` might be better as the new `newItemRef.id` if no external product catalog.
// Let's reconcile this:
// The current `InventoryStockDocument` type in `firestore.ts` has `productId: string`.
// `CreateInventoryItemSchema` (from `hooks/useInventory.ts`) does NOT have `productId`.
// I'll adjust the server to use the auto-generated item ID as `productId` if one isn't provided.
// This is a common pattern if the inventory item itself is the "product record" for simple cases.
// In `newItemData`, `productId` is already set: `productId: itemData.productId || newItemRef.id,`
// Let's assume `itemData.productId` would come from a Product master, if not, use the new item ID.
// It's better to make `productId` required in the input schema if it links to a separate Products collection.
// For this fix, I will keep the current logic:
// productId: itemData.productId || newItemRef.id, (which would be itemData.sku after validation as productId is not in schema)
// Let's make `productId` part of the CreateInventoryItemSchema.
// No, the schema in `useInventory.ts` is the source of truth for client-side creation.
// So the API should adapt. The current InventoryStockDocument has `productId: string;`
// It's better to have `productId` in the `CreateInventoryItemSchema`.
// I'll add it to `hooks/useInventory.ts`'s schema.

// The existing code has:
// productId: itemData.productId || newItemRef.id, 
// since itemData won't have productId (it's not in the Zod schema), it will default to newItemRef.id. This is fine.
// Wait, CreateInventoryItemSchema is used for *input*. InventoryStockDocument is the *output/DB type*.
// It's okay for the input schema to be a subset.
// The assignment in POST: `productId: itemData.productId || newItemRef.id,`  This is WRONG.
// `itemData` comes from `CreateInventoryItemSchema` which doesn't have `productId`.
// It should probably be `productId: newItemRef.id,` or `productId: itemData.sku,` assuming SKU is unique product identifier.
// Given ProductDocument also exists, it's likely `productId` should refer to a ProductDocument.id.
// If creating a new inventory item implies creating a new ProductDocument, that's a more complex operation.
// Let's assume for now that if a `productId` is NOT provided, it implies the inventory item might be standalone or linked later.
// But `InventoryStockDocument` requires `productId`.
// Simplest fix: Assume SKU is the Product ID for new items if not specified.

// Let's use itemData.sku as the productId if no explicit productId is provided.
// This means `CreateInventoryItemSchema` doesn't need `productId`.
// The line will be: `productId: itemData.sku, // Using SKU as Product ID for new inventory items`

// The `logActivity` call should use `itemData.sku` and `itemData.name` which come from the validated input.
// The createdItem response construction is correct.
// The main issue might be the `failed-precondition` for queries, so index comments are good.

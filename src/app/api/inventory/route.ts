
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { logActivity } from '@/lib/activityLog';
import { CreateInventoryItemSchema } from '@/hooks/useInventory';


export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  console.log('[API /inventory GET] Request received.');
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
    
    // Firestore query construction needs careful ordering of orderBy and where clauses.
    // If searchQuery is present, we typically want to order by the field we're searching on (e.g., sku or name).
    // For simplicity, if searchQuery is present, we'll order by SKU and assume search is on SKU.
    // More complex search would require more advanced indexing or a dedicated search service.
    if (searchQuery) {
      console.log(`[API /inventory GET] Applying search query: ${searchQuery} (on SKU)`);
      query = query.orderBy('sku').startAt(searchQuery).endAt(searchQuery + '\uf8ff');
    } else {
      // Default sort order if no search query
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
        lastUpdated: (data.lastUpdated as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
        createdAt: (data.createdAt as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
      };

      if (fieldsParam) {
        const requestedFields = fieldsParam.split(',');
        const selectedItem: Partial<InventoryStockDocument> = { id: doc.id }; 
        requestedFields.forEach(field => {
          if (field in data) {
            (selectedItem as any)[field] = data[field];
          }
        });
        // Ensure essential fields are present if requested specific fields
        if (!selectedItem.sku && data.sku) selectedItem.sku = data.sku;
        if (!selectedItem.name && data.name) selectedItem.name = data.name;
        if (selectedItem.quantity === undefined && data.quantity !== undefined) selectedItem.quantity = data.quantity;
        if (selectedItem.reorderPoint === undefined && data.reorderPoint !== undefined) selectedItem.reorderPoint = data.reorderPoint;
        return selectedItem;
      }
      return itemBase;
    });

    // Low stock filtering is done client-side in the hook if not handled by API query directly
    // This is because Firestore cannot directly compare two fields (quantity <= reorderPoint)
    if (lowStockOnly) {
      console.log(`[API /inventory GET] Applying lowStockOnly filter client-side (API part)`);
      items = items.filter(item => item.quantity !== undefined && item.reorderPoint !== undefined && item.reorderPoint > 0 && item.quantity <= item.reorderPoint);
    }
    // Search query filtering (name contains) is also better done client-side if not covered by SKU prefix search
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
      lastUpdated: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
      createdAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
      lowStockAlertSent: false,
      // Ensure all optional fields from schema have a default if not provided
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
        lastUpdated: (createdData?.lastUpdated as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
        createdAt: (createdData?.createdAt as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
    } as InventoryStockDocument;

    return NextResponse.json({ data: createdItem, message: 'Inventory item added successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding inventory item:', error);
    const message = error.message || 'Failed to add inventory item.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

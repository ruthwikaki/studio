
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { logActivity } from '@/lib/activityLog';
import { CreateInventoryItemSchema } from '@/hooks/useInventory';


export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  if (!requireRole(user.role, 'viewer')) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }
  const { companyId } = user;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const startAfterDocId = searchParams.get('startAfter'); // For cursor-based pagination
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const searchQuery = searchParams.get('search');
    const fieldsParam = searchParams.get('fields');
    
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('inventory')
                                                                        .where('companyId', '==', companyId)
                                                                        .where('deletedAt', '==', null); // Filter out soft-deleted items

    // Apply filters
    // IMPORTANT: Firestore requires composite indexes for queries with multiple different fields
    // in where clauses or orderBy clauses. Ensure these are created in your Firestore console.
    // Example indexes needed:
    // - (companyId, category, sku)
    // - (companyId, sku)
    // - (companyId, quantity) - if lowStockOnly is implemented server-side more directly
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    if (lowStockOnly) {
      // Firestore doesn't directly support quantity <= reorderPoint.
      // This filtering is best done client-side or by denormalizing an `isLowStock` field.
      // For now, we'll fetch all and filter post-query (less efficient for large datasets).
      // Alternative: query by quantity (e.g., quantity < 10) if reorder points are generally low.
    }
    
    if (searchQuery) {
       // This basic search requires an index on companyId and sku (or name if you sort by name).
       // For multi-field search (SKU or Name), you'd typically use a dedicated search service
       // or query for SKU then query for Name and merge results.
       query = query.orderBy('sku').startAt(searchQuery).endAt(searchQuery + '\uf8ff');
    } else {
       query = query.orderBy('sku'); // Default sort
    }
    
    console.time(`fetchInventoryList-${companyId}`);
    if (startAfterDocId) {
      const startAfterDoc = await db.collection('inventory').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    const snapshot = await query.limit(limit).get();
    console.timeEnd(`fetchInventoryList-${companyId}`);
    
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
        // Always include essential fields for client-side filtering even if not requested in `fields`
        lastUpdated: (data.lastUpdated as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
        createdAt: (data.createdAt as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
      };

      if (fieldsParam) {
        const requestedFields = fieldsParam.split(',');
        const selectedItem: Partial<InventoryStockDocument> = { id: doc.id }; // Always include id
        requestedFields.forEach(field => {
          if (field in data) {
            (selectedItem as any)[field] = data[field];
          }
        });
        // Ensure essential fields for display/logic are present if not explicitly requested
        if (!selectedItem.sku) selectedItem.sku = data.sku;
        if (!selectedItem.name) selectedItem.name = data.name;
        if (!selectedItem.quantity) selectedItem.quantity = data.quantity;
        return selectedItem;
      }
      return itemBase;
    });

    if (lowStockOnly) {
      items = items.filter(item => item.quantity !== undefined && item.reorderPoint !== undefined && item.quantity <= item.reorderPoint && item.reorderPoint > 0);
    }
     if (searchQuery && !fieldsParam) { // If search was on SKU, and fields weren't restricted, filter by name too
        const lowerSearchQuery = searchQuery.toLowerCase();
        items = items.filter(item => 
            item.sku?.toLowerCase().includes(lowerSearchQuery) ||
            (item.name && item.name.toLowerCase().includes(lowerSearchQuery))
        );
    }

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    
    return NextResponse.json({
      data: items,
      pagination: { 
          count: items.length, // Count of items in current page
          nextCursor: nextCursor
      },
    });

  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    if (error.code === 'failed-precondition') {
      return NextResponse.json({ error: 'Query requires a Firestore index. Check server logs for details and a link to create it.', details: error.message }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch inventory items.';
    return NextResponse.json({ error: message }, { status: 500 });
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
    const newItemData: Omit<InventoryStockDocument, 'id' | 'deletedAt'> = { // Ensure deletedAt is not set on create
      ...itemData,
      companyId,
      productId: itemData.sku, 
      createdBy: uid,
      lastUpdatedBy: uid,
      lastUpdated: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
      createdAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
      lowStockAlertSent: false,
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

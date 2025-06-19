
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { withAuth, VerifiedUser, requireRole } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { logActivity } from '@/lib/activityLog';
import { CreateInventoryItemSchema } from '@/hooks/useInventory';


export const GET = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  // Allow 'viewer' and above to read inventory
  if (!requireRole(user.role, 'viewer')) {
    return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
  }
  const { companyId } = user;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '8'); // Default to 8 for UI
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const searchQuery = searchParams.get('search');

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('inventory').where('companyId', '==', companyId);

    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
     // Note: Firestore does not support case-insensitive search or OR queries on different fields directly.
    // For robust search, a dedicated search service (Algolia, Elasticsearch) is recommended.
    // This is a simplified prefix search for SKU or Name (requires client to handle which field or try both).
    if (searchQuery) {
       query = query.orderBy('sku').startAt(searchQuery).endAt(searchQuery + '\uf8ff');
       // If you also want to search by name and combine, it gets more complex and might need multiple queries + client-side merging
       // or a denormalized searchable field.
    } else {
       query = query.orderBy('sku'); // Default sort
    }
    
    const countQuery = query;
    const totalItemsSnapshot = await countQuery.count().get();
    let totalItems = totalItemsSnapshot.data().count;

    const paginatedQuery = query.limit(limit).offset((page - 1) * limit);
    const snapshot = await paginatedQuery.get();
    let items: InventoryStockDocument[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastUpdated: (data.lastUpdated as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
        createdAt: (data.createdAt as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
      } as InventoryStockDocument;
    });

    if (lowStockOnly) {
      items = items.filter(item => item.quantity <= item.reorderPoint && item.reorderPoint > 0);
      totalItems = items.length; // Recalculate totalItems for this specific filtered view
    }
    // If search query was present and we need to filter by name additionally (if SKU search was primary)
    if (searchQuery) {
        const lowerSearchQuery = searchQuery.toLowerCase();
        items = items.filter(item => 
            item.sku.toLowerCase().includes(lowerSearchQuery) ||
            (item.name && item.name.toLowerCase().includes(lowerSearchQuery))
        );
         // totalItems might be less accurate if client expects combined search count.
    }


    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      data: items,
      pagination: { currentPage: page, pageSize: limit, totalItems, totalPages },
    });

  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    if (error.code === 'failed-precondition') {
      return NextResponse.json({ error: 'Query requires a Firestore index. Check server logs for details.', details: error.message }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch inventory items.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});


export const POST = withAuth(async (request: NextRequest, context: { params: any }, user: VerifiedUser) => {
  // Require 'manager' role or higher to create inventory items
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
                                  .limit(1)
                                  .get();
    if (!existingItemQuery.empty) {
        return NextResponse.json({ error: `SKU ${itemData.sku} already exists for this company.`}, {status: 409});
    }

    const newItemRef = db.collection('inventory').doc();
    const newItemData: Omit<InventoryStockDocument, 'id'> = {
      ...itemData, // Spread validated data
      companyId,
      productId: itemData.sku, // Assuming SKU is used as productId for now
      createdBy: uid,
      lastUpdatedBy: uid,
      lastUpdated: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
      createdAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
      lowStockAlertSent: false, // Default value
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
    const createdItem = { 
        id: createdDocSnap.id, 
        ...createdDocSnap.data(),
        lastUpdated: (createdDocSnap.data()?.lastUpdated as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
        createdAt: (createdDocSnap.data()?.createdAt as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
    } as InventoryStockDocument;


    return NextResponse.json({ data: createdItem, message: 'Inventory item added successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding inventory item:', error);
    const message = error.message || 'Failed to add inventory item.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

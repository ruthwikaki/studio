
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';

export async function GET(request: NextRequest) {
  try {
    const { companyId } = await verifyAuthToken(request);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized or companyId missing.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
    const searchQuery = searchParams.get('search');

    let query: admin.firestore.Query<admin.firestore.DocumentData> = db.collection('inventory').where('companyId', '==', companyId);

    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }
    if (searchQuery) {
      // Firestore basic search: case-sensitive prefix match. For more complex search, use a dedicated service.
      // This is a simplified approach. You might search by SKU or name.
      // If searching by multiple fields, you'd need more complex logic or a search service.
      // For this example, we'll search by SKU first, then try by name if no results (or combine queries).
      // For simplicity, we'll just allow searching by SKU for now.
      query = query.where('sku', '>=', searchQuery).where('sku', '<=', searchQuery + '\uf8ff');
      // To search by name also, you might need to do:
      // query = query.orderBy('name').startAt(searchQuery).endAt(searchQuery + '\uf8ff');
      // but combining orderBy on different fields for search and pagination can be tricky.
    }
    
    // For lowStockOnly, Firestore cannot directly compare two fields (quantity <= reorderPoint).
    // We will fetch based on other filters and then filter in memory for lowStockOnly.
    // Alternatively, add a denormalized `isLowStock` boolean field to your InventoryStockDocument.

    // Count total items for pagination before applying limit/offset for the main query
    // Note: Firestore counts can be expensive on large datasets. Consider alternative patterns.
    const countQuery = query; // Create a new reference for count
    const totalItemsSnapshot = await countQuery.count().get();
    const totalItems = totalItemsSnapshot.data().count;
    const totalPages = Math.ceil(totalItems / limit);

    // Apply pagination
    query = query.orderBy('sku').limit(limit).offset((page - 1) * limit); // Ensure an orderBy for pagination

    const snapshot = await query.get();
    let items: InventoryStockDocument[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Timestamps to ISO strings for JSON serialization
        lastUpdated: (data.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
      } as InventoryStockDocument;
    });

    // Server-side filter for lowStockOnly if requested
    if (lowStockOnly) {
      items = items.filter(item => item.quantity <= item.reorderPoint);
      // Note: The totalItems and totalPages might be slightly off if lowStockOnly is true
      // as the count was done before this filter. For accurate pagination with server-side filtering,
      // the filtering logic needs to be more complex or the count done after filtering (less efficient).
    }
     if (searchQuery) { // If simple SKU search didn't cover name, add post-filter for name
        const lowerSearchQuery = searchQuery.toLowerCase();
        items = items.filter(item => 
            item.sku.toLowerCase().includes(lowerSearchQuery) ||
            (item.name && item.name.toLowerCase().includes(lowerSearchQuery))
        );
    }


    return NextResponse.json({
      data: items,
      pagination: { currentPage: page, pageSize: limit, totalItems, totalPages },
    });

  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    const message = error.message || 'Failed to fetch inventory items.';
    if (error.code === 'MODULE_NOT_FOUND' || error.message.includes("Service account key not found")) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST method for adding new inventory items - Placeholder for now
export async function POST(request: NextRequest) {
  try {
    const { uid, companyId } = await verifyAuthToken(request);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized or companyId missing.' }, { status: 401 });
    }

    const body = await request.json();
    // Add validation for body here using Zod or similar

    const { sku, name, quantity, unitCost, reorderPoint, category, ...rest } = body;

    if (!sku || !name || quantity === undefined || unitCost === undefined || reorderPoint === undefined) {
      return NextResponse.json({ error: 'Missing required fields (sku, name, quantity, unitCost, reorderPoint).' }, { status: 400 });
    }
    
    // Check if SKU already exists for this company
    const existingItem = await db.collection('inventory').where('companyId', '==', companyId).where('sku', '==', sku).limit(1).get();
    if (!existingItem.empty) {
        return NextResponse.json({ error: `SKU ${sku} already exists for this company.`}, {status: 409});
    }


    const newItemRef = db.collection('inventory').doc(); // Auto-generate ID
    const newItemData: Omit<InventoryStockDocument, 'id' | 'lastUpdated'> & { lastUpdated: admin.firestore.FieldValue, createdAt: admin.firestore.FieldValue } = {
      companyId,
      productId: sku, // Assuming SKU is used as productId for now
      sku,
      name,
      quantity: Number(quantity),
      unitCost: Number(unitCost),
      reorderPoint: Number(reorderPoint),
      category: category || undefined,
      imageUrl: body.imageUrl || undefined, // Make sure to handle image uploads separately if needed
      createdBy: uid,
      lastUpdated: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(), // Added createdAt
      ...rest, // Include any other fields passed
    };

    await newItemRef.set(newItemData);
    const createdItem = { id: newItemRef.id, ...newItemData, lastUpdated: new Date().toISOString(), createdAt: new Date().toISOString() } as InventoryStockDocument;


    return NextResponse.json({ data: createdItem, message: 'Inventory item added successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding inventory item:', error);
    const message = error.message || 'Failed to add inventory item.';
     if (error.code === 'MODULE_NOT_FOUND' || error.message.includes("Service account key not found")) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { z } from 'zod';

// Zod schema for validating update payload
const UpdateInventoryItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQuantity: z.number().int().min(0).optional().nullable(),
  category: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  // Add other updatable fields here
}).partial(); // .partial() makes all fields optional

export async function GET(request: NextRequest, { params }: { params: { sku: string } }) {
  try {
    const { companyId } = await verifyAuthToken(request);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized or companyId missing.' }, { status: 401 });
    }

    const sku = params.sku;
    if (!sku) {
      return NextResponse.json({ error: 'SKU is required.' }, { status: 400 });
    }

    // In inventory collection, the document ID is the unique ID for the stock record.
    // SKU is a field within the document. We need to query by companyId and SKU.
    const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', sku)
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
      lastUpdated: (data.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
      // Add other timestamp conversions if necessary
    } as InventoryStockDocument;

    return NextResponse.json({ data: item });

  } catch (error: any) {
    console.error(`Error fetching inventory item ${params.sku}:`, error);
    const message = error.message || `Failed to fetch item ${params.sku}.`;
    if (error.code === 'MODULE_NOT_FOUND' || error.message.includes("Service account key not found")) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


export async function PUT(request: NextRequest, { params }: { params: { sku: string } }) {
  try {
    const { companyId } = await verifyAuthToken(request);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized or companyId missing.' }, { status: 401 });
    }

    const skuParam = params.sku;
    if (!skuParam) {
      return NextResponse.json({ error: 'SKU parameter is required.' }, { status: 400 });
    }

    const body = await request.json();
    const validationResult = UpdateInventoryItemSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid data.', details: validationResult.error.format() }, { status: 400 });
    }
    
    // Prepare update data, ensuring FieldValue for server timestamp
    const updatePayload = { 
      ...validationResult.data, 
      lastUpdated: FieldValue.serverTimestamp() 
    };

    // Find the document by companyId and SKU
    const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', skuParam)
                                  .limit(1)
                                  .get();

    if (inventoryQuery.empty) {
      return NextResponse.json({ error: `Inventory item with SKU ${skuParam} not found for this company.` }, { status: 404 });
    }
    
    const itemDocRef = inventoryQuery.docs[0].ref;
    await itemDocRef.update(updatePayload);
    
    const updatedDocSnap = await itemDocRef.get();
    const updatedData = updatedDocSnap.data();

    const updatedItem: InventoryStockDocument = {
      id: updatedDocSnap.id,
      ...updatedData,
      lastUpdated: (updatedData?.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
    } as InventoryStockDocument;
    
    return NextResponse.json({ data: updatedItem });

  } catch (error: any) {
    console.error(`Error updating inventory item ${params.sku}:`, error);
    const message = error.message || `Failed to update item ${params.sku}.`;
     if (error.code === 'MODULE_NOT_FOUND' || error.message.includes("Service account key not found")) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { sku: string } }) {
  try {
    const { companyId } = await verifyAuthToken(request);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized or companyId missing.' }, { status: 401 });
    }
    const skuParam = params.sku;
    if (!skuParam) {
      return NextResponse.json({ error: 'SKU parameter is required for deletion.' }, { status: 400 });
    }

    const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', skuParam)
                                  .limit(1)
                                  .get();
    
    if (inventoryQuery.empty) {
      return NextResponse.json({ error: `Inventory item with SKU ${skuParam} not found for this company.` }, { status: 404 });
    }

    const itemDocRef = inventoryQuery.docs[0].ref;
    await itemDocRef.delete();

    return NextResponse.json({ message: `Item ${skuParam} deleted successfully.` }, { status: 200 });

  } catch (error: any) {
    console.error(`Error deleting inventory item ${params.sku}:`, error);
    const message = error.message || `Failed to delete item ${params.sku}.`;
    if (error.code === 'MODULE_NOT_FOUND' || error.message.includes("Service account key not found")) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getDb, FieldValue, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { analyzeInventoryFile, AnalyzeInventoryFileInput } from '@/ai/flows/fileAnalysis';
import type { InventoryStockDocument } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

interface ParsedInventoryItem {
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  category?: string;
  description?: string;
  reorderQuantity?: number;
  location?: string;
  imageUrl?: string;
}

export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Inventory Upload] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Inventory Upload] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    console.error("Auth error in inventory upload:", authError);
    return NextResponse.json({ error: authError.message || 'Authentication failed.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let parsedItemsRaw: any[] = [];

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const csvData = buffer.toString('utf-8');
      const result = Papa.parse<any>(csvData, { header: true, skipEmptyLines: true, dynamicTyping: false });
      if (result.errors.length > 0) {
        console.error('CSV Parsing errors:', result.errors);
        return NextResponse.json({ error: 'Failed to parse CSV file.', details: result.errors.map(e => e.message) }, { status: 400 });
      }
      parsedItemsRaw = result.data;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      parsedItemsRaw = XLSX.utils.sheet_to_json<any>(worksheet, { rawNumbers: false });
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload CSV or XLSX.' }, { status: 400 });
    }

    if (!parsedItemsRaw || parsedItemsRaw.length === 0) {
        return NextResponse.json({ error: 'No data found in the file or failed to parse correctly.' }, { status: 400 });
    }
    
    const processedItemsForAI: Partial<InventoryStockDocument>[] = [];
    const batchWrite = db.batch();
    let itemsProcessedCount = 0;

    for (const [index, rawItem] of parsedItemsRaw.entries()) {
      const item: Partial<ParsedInventoryItem> = {};
      for (const key in rawItem) {
        const lowerKey = key.toLowerCase().replace(/\s+/g, '');
        if (lowerKey.includes('sku')) item.sku = String(rawItem[key]).trim();
        else if (lowerKey.includes('name') || lowerKey.includes('productname')) item.name = String(rawItem[key]).trim();
        else if (lowerKey.includes('quantity') || lowerKey.includes('qty')) item.quantity = parseFloat(String(rawItem[key]));
        else if (lowerKey.includes('cost') || lowerKey.includes('unitcost')) item.unitCost = parseFloat(String(rawItem[key]));
        else if (lowerKey.includes('reorderpoint')) item.reorderPoint = parseInt(String(rawItem[key]), 10);
        else if (lowerKey.includes('category')) item.category = String(rawItem[key]).trim();
        else if (lowerKey.includes('description')) item.description = String(rawItem[key]).trim();
        else if (lowerKey.includes('reorderquantity')) item.reorderQuantity = parseInt(String(rawItem[key]), 10);
        else if (lowerKey.includes('location')) item.location = String(rawItem[key]).trim();
        else if (lowerKey.includes('imageurl')) item.imageUrl = String(rawItem[key]).trim();
      }
      
      if (!item.sku || !item.name || item.quantity == null || Number.isNaN(item.quantity) || item.unitCost == null || Number.isNaN(item.unitCost) || item.reorderPoint == null || Number.isNaN(item.reorderPoint)) {
        console.warn(`Row ${index + 2}: Skipping due to missing required fields (sku, name, quantity, unitCost, reorderPoint). Found: ${JSON.stringify(rawItem)}`);
        continue;
      }

      const inventoryQuery = await db.collection('inventory')
                                  .where('companyId', '==', companyId)
                                  .where('sku', '==', item.sku)
                                  .limit(1)
                                  .get();
      
      const itemForAI: Partial<InventoryStockDocument> = { sku: item.sku, name: item.name, quantity: item.quantity, unitCost: item.unitCost, reorderPoint: item.reorderPoint, category: item.category };

      if (inventoryQuery.empty) {
        const newItemRef = db.collection('inventory').doc();
        const newItemData: Omit<InventoryStockDocument, 'id'> = {
          companyId,
          productId: item.sku,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          reorderPoint: item.reorderPoint,
          description: item.description,
          reorderQuantity: item.reorderQuantity !== undefined ? item.reorderQuantity : (item.reorderPoint > 0 ? Math.max(10, Math.floor(item.reorderPoint / 2)) : 0),
          category: item.category,
          location: item.location,
          imageUrl: item.imageUrl,
          lowStockAlertSent: false,
          notes: `Imported from file ${file.name}`,
          createdBy: userId,
          lastUpdatedBy: userId,
          createdAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          lastUpdated: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        };
        batchWrite.set(newItemRef, newItemData);
        processedItemsForAI.push({id: newItemRef.id, ...newItemData});

      } else {
        const existingDocRef = inventoryQuery.docs[0].ref;
        const updateData: Partial<InventoryStockDocument> & { lastUpdatedBy: string, lastUpdated: FirebaseFirestore.FieldValue } = {
            lastUpdatedBy: userId,
            lastUpdated: FieldValue.serverTimestamp(),
        };
        if (item.name !== undefined) updateData.name = item.name;
        if (item.quantity !== undefined) updateData.quantity = item.quantity;
        if (item.unitCost !== undefined) updateData.unitCost = item.unitCost;
        if (item.reorderPoint !== undefined) updateData.reorderPoint = item.reorderPoint;
        if (item.category !== undefined) updateData.category = item.category;
        if (item.description !== undefined) updateData.description = item.description;
        if (item.reorderQuantity !== undefined) updateData.reorderQuantity = item.reorderQuantity;
        if (item.location !== undefined) updateData.location = item.location;
        if (item.imageUrl !== undefined) updateData.imageUrl = item.imageUrl;
        
        batchWrite.update(existingDocRef, updateData);
        const existingData = inventoryQuery.docs[0].data() as InventoryStockDocument;
        processedItemsForAI.push({ ...existingData, ...updateData, id: existingDocRef.id});
      }
      itemsProcessedCount++;
    }

    if (itemsProcessedCount > 0) {
        await batchWrite.commit();
    } else if (parsedItemsRaw.length > 0) {
         return NextResponse.json({ error: 'No valid items found in the file to process.' }, { status: 400 });
    }

    const aiInput: AnalyzeInventoryFileInput = {
      parsedInventoryData: JSON.stringify(processedItemsForAI.map(p => ({
        sku: p.sku, name: p.name, quantity: p.quantity, unitCost: p.unitCost,
        reorderPoint: p.reorderPoint, category: p.category, description: p.description,
        reorderQuantity: p.reorderQuantity, location: p.location,
      }))),
    };
    const aiInsights = await analyzeInventoryFile(aiInput);

    return NextResponse.json({ 
        message: `${itemsProcessedCount} items processed from ${file.name}.`,
        aiInsights 
    });

  } catch (error: any) {
    console.error('Error uploading inventory:', error);
    const message = error.message || 'Failed to upload inventory.';
     if (error.code === 'MODULE_NOT_FOUND' || (error.message && error.message.includes("Service account key not found"))) {
        return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Service account key may be missing or incorrect.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

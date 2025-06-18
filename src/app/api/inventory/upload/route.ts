
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
// import { getFirestoreAdmin, FieldValue } from 'firebase-admin/firestore'; // Placeholder
// import { verifyAuthToken } from '@/lib/firebase/admin-auth'; // Placeholder
import { analyzeInventoryFile, AnalyzeInventoryFileInput } from '@/ai/flows/fileAnalysis';
import type { InventoryItemDocument } from '@/lib/types/firestore';

// Placeholder for Firestore instance
// const db = getFirestoreAdmin();

interface ParsedInventoryItem {
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  category?: string;
  description?: string;
  // Add other expected fields from CSV/Excel
}

export async function POST(request: NextRequest) {
  // TODO: Implement Firebase Auth token verification
  // const { uid } = await verifyAuthToken(request);
  // if (!uid) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  const userId = "mockUserId"; // Replace with actual uid

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let parsedData: ParsedInventoryItem[] = [];

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const csvData = buffer.toString('utf-8');
      const result = Papa.parse<ParsedInventoryItem>(csvData, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Automatically converts numbers, booleans
      });
      if (result.errors.length > 0) {
        console.error('CSV Parsing errors:', result.errors);
        return NextResponse.json({ error: 'Failed to parse CSV file.', details: result.errors.map(e => e.message) }, { status: 400 });
      }
      parsedData = result.data;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Ensure correct types, especially for numeric fields from Excel
      parsedData = XLSX.utils.sheet_to_json<ParsedInventoryItem>(worksheet, {
        // raw: false, // Use formatted strings, then parse them carefully
        // defval: null // handle empty cells as null
      }).map(row => ({
        ...row,
        quantity: Number(row.quantity) || 0,
        unitCost: Number(row.unitCost) || 0,
        reorderPoint: Number(row.reorderPoint) || 0,
      }));
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload CSV or XLSX.' }, { status: 400 });
    }

    if (!parsedData || parsedData.length === 0) {
        return NextResponse.json({ error: 'No data found in the file or failed to parse correctly.' }, { status: 400 });
    }
    
    // Validate data structure (basic example)
    const validatedItems: InventoryItemDocument[] = parsedData.map((item, index) => {
      if (!item.sku || !item.name || item.quantity == null || item.unitCost == null || item.reorderPoint == null) {
        throw new Error(`Row ${index + 2}: Missing required fields (sku, name, quantity, unitCost, reorderPoint). Found: ${JSON.stringify(item)}`);
      }
      return {
        id: item.sku, // Assuming SKU is unique and can be used as ID
        userId,
        sku: String(item.sku),
        name: String(item.name),
        description: item.description ? String(item.description) : undefined,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        reorderPoint: Number(item.reorderPoint),
        reorderQuantity: Number(item.reorderPoint) > 0 ? Math.max(10, Number(item.reorderPoint) / 2) : 0, // Example logic
        category: item.category ? String(item.category) : undefined,
        lastUpdated: new Date() as any, // FieldValue.serverTimestamp() in actual Firestore,
        lowStockAlertSent: false,
      };
    }).filter(item => item !== null);


    // Placeholder for Firestore bulk insert
    // const batch = db.batch();
    // validatedItems.forEach(item => {
    //   const docRef = db.collection('inventory').doc(item.sku); // Or generate unique ID
    //   batch.set(docRef, item);
    // });
    // await batch.commit();

    // Call fileAnalysis Genkit flow
    const aiInput: AnalyzeInventoryFileInput = {
      parsedInventoryData: JSON.stringify(validatedItems.map(({userId, lastUpdated, ...rest}) => rest)), // Send relevant data
    };
    const aiInsights = await analyzeInventoryFile(aiInput);

    return NextResponse.json({ 
        message: `${validatedItems.length} items processed successfully.`,
        aiInsights 
    });

  } catch (error) {
    console.error('Error uploading inventory:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload inventory.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

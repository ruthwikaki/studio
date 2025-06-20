
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';
import { UpdateSupplierSchema } from '@/hooks/useSuppliers';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminInitialized()) {
    console.error("[API Supplier Detail GET] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Supplier Detail GET] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }
  
  const supplierId = params.id;

  if (!supplierId) {
    return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });
  }

  try {
    const docRef = db.collection('suppliers').doc(supplierId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }
    
    const supplierData = docSnap.data() as SupplierDocument;
    if (supplierData.companyId !== companyId) {
      return NextResponse.json({ error: 'Access denied to this supplier.' }, { status: 403 });
    }

    const supplierResponse = {
      id: docSnap.id,
      ...supplierData,
      createdAt: (supplierData.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
      lastUpdated: (supplierData.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
      lastOrderDate: supplierData.lastOrderDate ? (supplierData.lastOrderDate as admin.firestore.Timestamp).toDate().toISOString() : undefined,
      deletedAt: supplierData.deletedAt ? (supplierData.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
    } as SupplierDocument;

    return NextResponse.json({ data: supplierResponse });
  } catch (error: any) {
    console.error(`Error fetching supplier ${supplierId}:`, error);
    const message = error.message || `Failed to fetch supplier ${supplierId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminInitialized()) {
    console.error("[API Supplier Detail PUT] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Supplier Detail PUT] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }
  
  const supplierId = params.id;

  if (!supplierId) {
    return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validationResult = UpdateSupplierSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid supplier data.', details: validationResult.error.format() }, { status: 400 });
    }
    
    const { productsSuppliedSkus, ...updateDataFromPayload } = validationResult.data;
    
    const supplierRef = db.collection('suppliers').doc(supplierId);
    const docSnap = await supplierRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Supplier not found.' }, { status: 404 });
    }
    if (docSnap.data()?.companyId !== companyId) {
      return NextResponse.json({ error: 'Access denied to update this supplier.' }, { status: 403 });
    }
    
    const finalUpdateData: any = { 
        ...updateDataFromPayload, 
        lastUpdated: FieldValue.serverTimestamp(),
        lastUpdatedBy: userId, 
    };

    if (productsSuppliedSkus !== undefined) {
        finalUpdateData.productsSupplied = (productsSuppliedSkus || []).map((sku: string) => ({
            productId: sku, sku: sku, name: `Product ${sku}`, // Placeholder name
        }));
    }
    
    await supplierRef.update(finalUpdateData);
    
    const updatedDoc = await supplierRef.get();
    const updatedData = updatedDoc.data();

    const updatedSupplierResponse = { 
      id: updatedDoc.id, 
      ...updatedData,
      createdAt: (updatedData?.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
      lastUpdated: (updatedData?.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
      lastOrderDate: updatedData?.lastOrderDate ? (updatedData.lastOrderDate as admin.firestore.Timestamp).toDate().toISOString() : undefined,
      deletedAt: updatedData?.deletedAt ? (updatedData.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
    } as SupplierDocument;

    return NextResponse.json({ data: updatedSupplierResponse });

  } catch (error: any) {
    console.error(`Error updating supplier ${supplierId}:`, error);
    const message = error.message || `Failed to update supplier ${supplierId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

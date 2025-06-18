
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// import { getFirestoreAdmin, FieldValue } from 'firebase-admin/firestore'; // Placeholder
// import { verifyAuthToken } from '@/lib/firebase/admin-auth'; // Placeholder
import type { SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';
import { UpdateSupplierSchema } from '@/hooks/useSuppliers';

// Placeholder for Firestore instance
// const db = getFirestoreAdmin();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement Firebase Auth token verification
  // const { uid } = await verifyAuthToken(request);
  // if (!uid) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  // const userId = uid;
  const supplierId = params.id;

  if (!supplierId) {
    return NextResponse.json({ error: 'Supplier ID is required.' }, { status: 400 });
  }

  try {
    // Placeholder for Firestore query
    // const docRef = db.collection('suppliers').doc(supplierId);
    // const docSnap = await docRef.get();
    // if (!docSnap.exists || docSnap.data()?.userId !== userId) {
    //   return NextResponse.json({ error: 'Supplier not found or access denied.' }, { status: 404 });
    // }
    // const supplier = { id: docSnap.id, ...docSnap.data() } as SupplierDocument;
    
    // Mocked response
    const MOCK_SUPPLIER: SupplierDocument = {
      id: supplierId,
      userId: "user123",
      name: "Global Electronics Ltd. (Mock)",
      email: "sales@globalelec-mock.com",
      phone: "123-456-7890",
      address: { street: "123 Tech Rd", city: "Electron", state: "CA", zipCode: "90210", country: "USA" },
      contactPerson: { name: "Jane Doe", email: "jane@globalelec-mock.com" },
      leadTimeDays: 14,
      reliabilityScore: 85,
      paymentTerms: "Net 30",
      moq: 100,
      productsSupplied: [
        { productId: "SKU002", sku: "SKU002", name: "Wireless Mouse", lastPrice: 18, moqForItem: 50 },
        { productId: "SKU007", sku: "SKU007", name: "USB Hub", lastPrice: 12, moqForItem: 30 },
      ],
      notes: "Reliable for core components.",
      lastOrderDate: new Date() as any,
      totalSpend: 12500,
      onTimeDeliveryRate: 0.95,
      qualityRating: 4.5,
      createdAt: new Date() as any,
      lastUpdated: new Date() as any,
      logoUrl: "https://placehold.co/100x100.png"
    };
    if (supplierId !== "SUP001_mock" && supplierId !== "SUP001") { // Make it a bit more dynamic for testing
        MOCK_SUPPLIER.name = `Supplier ${supplierId}`;
    }


    return NextResponse.json({ data: MOCK_SUPPLIER });
  } catch (error) {
    console.error(`Error fetching supplier ${supplierId}:`, error);
    const message = error instanceof Error ? error.message : `Failed to fetch supplier ${supplierId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // TODO: Implement Firebase Auth token verification
  // const { uid } = await verifyAuthToken(request);
  // if (!uid) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  const userId = "mockUserId"; // Replace with actual uid
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
    
    const updateDataFromPayload = validationResult.data;
    
    // Placeholder for fetching current products if only SKUs are sent for update
    // const currentSupplierDoc = await db.collection('suppliers').doc(supplierId).get();
    // const currentProducts = (currentSupplierDoc.data()?.productsSupplied || []) as SupplierProductInfo[];

    let productsSupplied: SupplierProductInfo[] | undefined = undefined;
    if (updateDataFromPayload.productsSuppliedSkus) {
        productsSupplied = updateDataFromPayload.productsSuppliedSkus.map(sku => ({
            productId: sku,
            sku: sku,
            name: `Product ${sku}`, // Placeholder name, fetch if needed
            // lastPrice and moqForItem would need more complex logic to update or preserve
        }));
    }
    
    // Construct the final update object, removing productsSuppliedSkus
    const { productsSuppliedSkus, ...restOfUpdateData } = updateDataFromPayload;
    const finalUpdateData: any = { 
        ...restOfUpdateData, 
        lastUpdated: new Date() as any, // FieldValue.serverTimestamp() 
    };
    if (productsSupplied) {
        finalUpdateData.productsSupplied = productsSupplied;
    }


    // Placeholder for Firestore update
    // const itemRef = db.collection('suppliers').doc(supplierId);
    // const doc = await itemRef.get();
    // if (!doc.exists || doc.data()?.userId !== userId) {
    //   return NextResponse.json({ error: 'Supplier not found or access denied.' }, { status: 404 });
    // }
    // await itemRef.update(finalUpdateData);
    // const updatedDoc = await itemRef.get();
    // const updatedSupplier = { id: updatedDoc.id, ...updatedDoc.data() } as SupplierDocument;
    
    const mockUpdatedSupplier: SupplierDocument = {
      id: supplierId,
      userId,
      name: finalUpdateData.name || "Updated Supplier Inc.",
      email: finalUpdateData.email || "contact@updated.com",
      leadTimeDays: finalUpdateData.leadTimeDays || 10,
      reliabilityScore: finalUpdateData.reliabilityScore || 90,
      productsSupplied: finalUpdateData.productsSupplied || [],
      createdAt: new Date(Date.now() - 100000) as any, // Keep original createdAt
      lastUpdated: finalUpdateData.lastUpdated,
      logoUrl: "https://placehold.co/100x100.png"
    };

    return NextResponse.json({ data: mockUpdatedSupplier });
  } catch (error) {
    console.error(`Error updating supplier ${supplierId}:`, error);
    const message = error instanceof Error ? error.message : `Failed to update supplier ${supplierId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

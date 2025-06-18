
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// import { getFirestoreAdmin, FieldValue } from 'firebase-admin/firestore'; // Placeholder
// import { verifyAuthToken } from '@/lib/firebase/admin-auth'; // Placeholder
import type { SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';
import { CreateSupplierSchema } from '@/hooks/useSuppliers'; // Using Zod schema from hook for validation

// Placeholder for Firestore instance
// const db = getFirestoreAdmin();

export async function GET(request: NextRequest) {
  // TODO: Implement Firebase Auth token verification
  // const { uid } = await verifyAuthToken(request);
  // if (!uid) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  // const userId = uid;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const searchTerm = searchParams.get('search');
  const reliability = searchParams.get('reliability'); // e.g. "high", "medium", "low" or score range
  const leadTime = searchParams.get('leadTime'); // e.g. "0-7", "8-14"

  try {
    // Placeholder for Firestore query
    // let query = db.collection('suppliers').where('userId', '==', userId);
    // if (searchTerm) {
    //   // Complex search might require Algolia/Typesense or multiple field checks
    //   query = query.where('name', '>=', searchTerm).where('name', '<=', searchTerm + '\uf8ff');
    // }
    // if (reliability) { /* Add reliability filter */ }
    // if (leadTime) { /* Add lead time filter */ }

    // const snapshot = await query.limit(limit).offset((page - 1) * limit).get();
    // const suppliers: SupplierDocument[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierDocument));
    // const totalItemsSnapshot = await query.count().get();
    // const totalItems = totalItemsSnapshot.data().count;

    // Mocked response
    const MOCK_SUPPLIERS: SupplierDocument[] = [
      { id: "SUP001", userId: "user123", name: "Global Electronics Ltd.", email: "sales@globalelec.com", leadTimeDays: 14, reliabilityScore: 85, productsSupplied: [{productId: "SKU002", sku: "SKU002", name:"Wireless Mouse", lastPrice: 18, moqForItem: 50}], lastOrderDate: new Date() as any, createdAt: new Date() as any, lastUpdated: new Date() as any, logoUrl: "https://placehold.co/60x60.png" },
      { id: "SUP002", userId: "user123", name: "ApparelCo", email: "orders@apparelco.com", leadTimeDays: 7, reliabilityScore: 92, productsSupplied: [{productId: "SKU001", sku: "SKU001", name:"Blue T-Shirt", lastPrice: 9, moqForItem: 100}], lastOrderDate: new Date() as any, createdAt: new Date() as any, lastUpdated: new Date() as any, logoUrl: "https://placehold.co/60x60.png" },
      { id: "SUP003", userId: "user123", name: "OfficePro Supplies", email: "contact@officepro.com", leadTimeDays: 5, reliabilityScore: 70, productsSupplied: [{productId: "SKU005", sku:"SKU005", name:"Laptop Stand", lastPrice: 15, moqForItem: 20}], lastOrderDate: new Date() as any, createdAt: new Date() as any, lastUpdated: new Date() as any, logoUrl: "https://placehold.co/60x60.png" },
    ];
    
    const filteredSuppliers = MOCK_SUPPLIERS.filter(s => {
        let matches = true;
        if (searchTerm) matches = matches && s.name.toLowerCase().includes(searchTerm.toLowerCase());
        // Add more filter logic here based on reliability and leadTime if implementing client-side filtering for mock
        return matches;
    });

    const paginatedSuppliers = filteredSuppliers.slice((page - 1) * limit, page * limit);

    return NextResponse.json({ 
        data: paginatedSuppliers, 
        pagination: { currentPage: page, pageSize: limit, totalItems: filteredSuppliers.length, totalPages: Math.ceil(filteredSuppliers.length / limit) } 
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch suppliers.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // TODO: Implement Firebase Auth token verification
  // const { uid } = await verifyAuthToken(request);
  // if (!uid) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }
  const userId = "mockUserId"; // Replace with actual uid

  try {
    const body = await request.json();
    const validationResult = CreateSupplierSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid supplier data.', details: validationResult.error.format() }, { status: 400 });
    }

    const newSupplierData = validationResult.data;
    
    // Convert productsSuppliedSkus to SupplierProductInfo[] (simplified)
    // In a real scenario, you'd fetch product names based on SKUs
    const productsSupplied: SupplierProductInfo[] = (newSupplierData.productsSuppliedSkus || []).map(sku => ({
        productId: sku, // Assuming SKU is product ID
        sku: sku,
        name: `Product ${sku}`, // Placeholder name
    }));

    const supplierDoc: Omit<SupplierDocument, 'id' | 'createdAt' | 'lastUpdated'> = {
      userId,
      name: newSupplierData.name,
      email: newSupplierData.email,
      phone: newSupplierData.phone,
      address: newSupplierData.address,
      contactPerson: newSupplierData.contactPerson,
      leadTimeDays: newSupplierData.leadTimeDays,
      reliabilityScore: newSupplierData.reliabilityScore,
      paymentTerms: newSupplierData.paymentTerms,
      moq: newSupplierData.moq,
      productsSupplied: productsSupplied,
      notes: newSupplierData.notes,
      // lastOrderDate, totalSpend, onTimeDeliveryRate, etc., would be updated by other processes
    };

    // Placeholder for Firestore document creation
    // const supplierRef = db.collection('suppliers').doc();
    // await supplierRef.set({
    //   ...supplierDoc,
    //   createdAt: FieldValue.serverTimestamp(),
    //   lastUpdated: FieldValue.serverTimestamp(),
    // });
    // const createdSupplier = { id: supplierRef.id, ...supplierDoc, createdAt: new Date(), lastUpdated: new Date() } as SupplierDocument;
    
    const mockCreatedSupplier: SupplierDocument = {
        id: "SUP" + Date.now(),
        ...supplierDoc,
        logoUrl: "https://placehold.co/60x60.png",
        createdAt: new Date() as any,
        lastUpdated: new Date() as any,
    };

    return NextResponse.json({ data: mockCreatedSupplier, message: 'Supplier created successfully.' }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);
    const message = error instanceof Error ? error.message : 'Failed to create supplier.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

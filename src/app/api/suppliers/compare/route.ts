
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// import { getFirestoreAdmin } from 'firebase-admin/firestore'; // Placeholder
// import { verifyAuthToken } from '@/lib/firebase/admin-auth'; // Placeholder
import type { SupplierDocument } from '@/lib/types/firestore';

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
  const idsString = searchParams.get('ids'); // Expecting comma-separated IDs, e.g., "id1,id2,id3"

  if (!idsString) {
    return NextResponse.json({ error: 'Supplier IDs are required for comparison.' }, { status: 400 });
  }

  const supplierIds = idsString.split(',').map(id => id.trim()).filter(id => id);

  if (supplierIds.length < 2 || supplierIds.length > 3) {
    return NextResponse.json({ error: 'Please provide 2 or 3 supplier IDs to compare.' }, { status: 400 });
  }

  try {
    // Placeholder for fetching multiple suppliers from Firestore
    // const supplierPromises = supplierIds.map(id => db.collection('suppliers').doc(id).get());
    // const supplierDocs = await Promise.all(supplierPromises);
    // const suppliers: SupplierDocument[] = supplierDocs
    //   .filter(doc => doc.exists && doc.data()?.userId === userId)
    //   .map(doc => ({ id: doc.id, ...doc.data() } as SupplierDocument));

    // Mocked response for now
    const MOCK_SUPPLIERS_FOR_COMPARISON: SupplierDocument[] = supplierIds.map((id, index) => ({
      id: id,
      userId: "user123",
      name: `Supplier ${id.slice(0,5)}`,
      email: `info@supplier${index + 1}.com`,
      leadTimeDays: 5 + (index * 3), // 5, 8, 11
      reliabilityScore: 75 + (index * 5), // 75, 80, 85
      paymentTerms: index % 2 === 0 ? "Net 30" : "Net 60",
      moq: 50 + (index * 25), // 50, 75, 100
      productsSupplied: [
        { productId: "SKU_COMMON", sku: "SKU_COMMON", name: "Common Product", lastPrice: 10 + index, moqForItem: 10 },
      ],
      createdAt: new Date() as any,
      lastUpdated: new Date() as any,
      logoUrl: `https://placehold.co/80x80.png?text=S${index+1}`
    }));

    if (MOCK_SUPPLIERS_FOR_COMPARISON.length !== supplierIds.length) {
        return NextResponse.json({ error: 'One or more suppliers not found or access denied.' }, { status: 404 });
    }

    return NextResponse.json({ data: MOCK_SUPPLIERS_FOR_COMPARISON });
  } catch (error) {
    console.error('Error comparing suppliers:', error);
    const message = error instanceof Error ? error.message : 'Failed to compare suppliers.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

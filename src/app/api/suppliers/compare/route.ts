
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { SupplierDocument } from '@/lib/types/firestore';

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idsString = searchParams.get('ids');

  if (!idsString) {
    return NextResponse.json({ error: 'Supplier IDs are required for comparison.' }, { status: 400 });
  }

  const supplierIds = idsString.split(',').map(id => id.trim()).filter(id => id);

  if (supplierIds.length === 0) {
    return NextResponse.json({ error: 'No supplier IDs provided.' }, { status: 400 });
  }
  if (supplierIds.length > 5) { // Limit comparison size for performance
    return NextResponse.json({ error: 'Cannot compare more than 5 suppliers at a time.' }, { status: 400 });
  }

  try {
    const supplierPromises = supplierIds.map(id => db.collection('suppliers').doc(id).get());
    const supplierDocSnaps = await Promise.all(supplierPromises);
    
    const suppliers: SupplierDocument[] = [];
    for (const docSnap of supplierDocSnaps) {
      if (docSnap.exists) {
        const data = docSnap.data() as SupplierDocument;
        if (data.companyId === companyId) {
          suppliers.push({
            id: docSnap.id,
            ...data,
            createdAt: (data.createdAt as AdminTimestamp)?.toDate().toISOString(),
            lastUpdated: (data.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
            lastOrderDate: (data.lastOrderDate as AdminTimestamp)?.toDate().toISOString(),
          } as SupplierDocument);
        }
      }
    }

    if (suppliers.length === 0) {
        return NextResponse.json({ error: 'No valid suppliers found for the given IDs and company.' }, { status: 404 });
    }
     if (suppliers.length !== supplierIds.length) {
      console.warn(`Compare suppliers: Requested ${supplierIds.length} IDs, but found ${suppliers.length} valid suppliers for company ${companyId}.`);
      // Proceed with found suppliers. Client can handle partial results.
    }


    return NextResponse.json({ data: suppliers });

  } catch (error: any) {
    console.error('Error comparing suppliers:', error);
    const message = error.message || 'Failed to compare suppliers.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

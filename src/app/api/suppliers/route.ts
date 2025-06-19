
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';
import { CreateSupplierSchema } from '@/hooks/useSuppliers'; // Using Zod schema from hook for validation

export async function GET(request: NextRequest) {
  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const searchTerm = searchParams.get('search');
  const reliabilityFilter = searchParams.get('reliability'); // e.g. "85-100"
  const leadTimeFilter = searchParams.get('leadTime'); // e.g. "0-7"

  try {
    let query: admin.firestore.Query<admin.firestore.DocumentData> = db.collection('suppliers').where('companyId', '==', companyId);

    if (searchTerm) {
      // Basic prefix search on name. For "contains" or more advanced search, a dedicated search service is better.
      query = query.orderBy('name').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
    }

    if (reliabilityFilter) {
      const [minRel, maxRel] = reliabilityFilter.split('-').map(Number);
      if (!isNaN(minRel)) query = query.where('reliabilityScore', '>=', minRel);
      if (!isNaN(maxRel)) query = query.where('reliabilityScore', '<=', maxRel);
      // Note: Firestore requires an orderBy for range filters if not the first orderBy.
      // If searchTerm is also used, this might require a composite index or client-side filtering for complex scenarios.
      // For now, if searchTerm is present, name is already ordered. If not, order by reliabilityScore.
      if (!searchTerm) query = query.orderBy('reliabilityScore');
    }

    if (leadTimeFilter) {
      const [minLead, maxLead] = leadTimeFilter.split('-').map(Number);
      if (leadTimeFilter.endsWith('+')) { // e.g. "15+"
         if (!isNaN(minLead)) query = query.where('leadTimeDays', '>=', minLead);
      } else {
        if (!isNaN(minLead)) query = query.where('leadTimeDays', '>=', minLead);
        if (!isNaN(maxLead)) query = query.where('leadTimeDays', '<=', maxLead);
      }
       if (!searchTerm && !reliabilityFilter) query = query.orderBy('leadTimeDays');
    }
    
    // Default sort if no other sorting is applied
    if (!searchTerm && !reliabilityFilter && !leadTimeFilter) {
        query = query.orderBy('name');
    }


    const totalItemsSnapshot = await query.count().get();
    const totalItems = totalItemsSnapshot.data().count;
    const totalPages = Math.ceil(totalItems / limit);

    const paginatedQuery = query.limit(limit).offset((page - 1) * limit);
    const snapshot = await paginatedQuery.get();
    
    const suppliers: SupplierDocument[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as AdminTimestamp)?.toDate().toISOString(),
        lastUpdated: (data.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
        lastOrderDate: (data.lastOrderDate as AdminTimestamp)?.toDate().toISOString(),
      } as SupplierDocument;
    });
    
    return NextResponse.json({ 
        data: suppliers, 
        pagination: { currentPage: page, pageSize: limit, totalItems, totalPages } 
    });

  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    if (error.code === 'failed-precondition') {
      return NextResponse.json({ 
        error: 'Query requires an index. Please create the necessary composite index in Firestore.',
        details: error.message
      }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch suppliers.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = CreateSupplierSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid supplier data.', details: validationResult.error.format() }, { status: 400 });
    }

    const { productsSuppliedSkus, ...newSupplierData } = validationResult.data;
    
    const productsSupplied: SupplierProductInfo[] = (productsSuppliedSkus || []).map(sku => ({
        productId: sku, // Assuming SKU is product ID for now
        sku: sku,
        name: `Product ${sku}`, // Placeholder name, ideally fetch or allow detailed entry
    }));

    const supplierDocRef = db.collection('suppliers').doc();
    const fullSupplierData: Omit<SupplierDocument, 'id' | 'createdAt' | 'lastUpdated'> & { createdAt: FirebaseFirestore.FieldValue, lastUpdated: FirebaseFirestore.FieldValue, createdBy: string } = {
      companyId,
      createdBy: userId,
      ...newSupplierData,
      leadTimeDays: newSupplierData.leadTimeDays ?? 0, // Ensure number or default
      reliabilityScore: newSupplierData.reliabilityScore ?? 0,
      moq: newSupplierData.moq ?? 0,
      productsSupplied: productsSupplied,
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
    };

    await supplierDocRef.set(fullSupplierData);
    const createdDoc = await supplierDocRef.get();
    const createdData = createdDoc.data();

    const responseSupplier = {
      id: createdDoc.id,
      ...createdData,
      createdAt: (createdData?.createdAt as AdminTimestamp)?.toDate().toISOString(),
      lastUpdated: (createdData?.lastUpdated as AdminTimestamp)?.toDate().toISOString(),
    } as SupplierDocument;


    return NextResponse.json({ data: responseSupplier, message: 'Supplier created successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating supplier:', error);
    const message = error.message || 'Failed to create supplier.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

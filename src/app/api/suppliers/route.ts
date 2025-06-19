
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
  const limit = parseInt(searchParams.get('limit') || '10');
  const startAfterDocId = searchParams.get('startAfter'); // For cursor-based pagination
  const searchTerm = searchParams.get('search');
  const reliabilityFilter = searchParams.get('reliability'); // e.g. "85-100"
  const leadTimeFilter = searchParams.get('leadTime'); // e.g. "0-7"

  try {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('suppliers').where('companyId', '==', companyId);

    if (searchTerm) {
      query = query.orderBy('name').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
    }

    if (reliabilityFilter) {
      const [minRelStr, maxRelStr] = reliabilityFilter.split('-');
      const minRel = parseInt(minRelStr, 10);
      const maxRel = parseInt(maxRelStr, 10);
      if (!isNaN(minRel)) query = query.where('reliabilityScore', '>=', minRel);
      if (!isNaN(maxRel)) query = query.where('reliabilityScore', '<=', maxRel);
      if (!searchTerm) query = query.orderBy('reliabilityScore', 'desc'); // Sort by reliability if not searching by name
    }

    if (leadTimeFilter) {
      const [minLeadStr, maxLeadPlusStr] = leadTimeFilter.split('-');
      const minLead = parseInt(minLeadStr, 10);
      const maxLead = parseInt(maxLeadPlusStr, 10); // Will be NaN if it's "15+"

      if (!isNaN(minLead)) query = query.where('leadTimeDays', '>=', minLead);
      if (!isNaN(maxLead)) { // if maxLead is a number
        query = query.where('leadTimeDays', '<=', maxLead);
      }
      // If not searching or filtering by reliability, sort by leadTime
      if (!searchTerm && !reliabilityFilter) query = query.orderBy('leadTimeDays');
    }
    
    if (!searchTerm && !reliabilityFilter && !leadTimeFilter) {
        query = query.orderBy('name');
    }

    if (startAfterDocId) {
      const startAfterDoc = await db.collection('suppliers').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    const snapshot = await query.limit(limit).get();
    
    const suppliers: SupplierDocument[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
        lastUpdated: (data.lastUpdated as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
        lastOrderDate: data.lastOrderDate ? (data.lastOrderDate as FirebaseFirestore.Timestamp).toDate().toISOString() : undefined,
      } as SupplierDocument;
    });
    
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    
    return NextResponse.json({ 
        data: suppliers, 
        pagination: { 
            count: suppliers.length,
            nextCursor
        } 
    });

  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    if (error.code === 'failed-precondition') {
      return NextResponse.json({ 
        error: 'Query requires an index. Please create the necessary composite index in Firestore. Details: ' + error.message,
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
        productId: sku, 
        sku: sku,
        name: `Product ${sku}`, 
    }));

    const supplierDocRef = db.collection('suppliers').doc();
    const fullSupplierData: Omit<SupplierDocument, 'id' | 'createdAt' | 'lastUpdated'> & { createdAt: FirebaseFirestore.FieldValue, lastUpdated: FirebaseFirestore.FieldValue, createdBy: string, lastUpdatedBy: string } = {
      companyId,
      createdBy: userId,
      lastUpdatedBy: userId,
      ...newSupplierData,
      leadTimeDays: newSupplierData.leadTimeDays ?? 0,
      reliabilityScore: newSupplierData.reliabilityScore ?? undefined, // Allow undefined if not set
      moq: newSupplierData.moq ?? undefined,
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
      createdAt: (createdData?.createdAt as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
      lastUpdated: (createdData?.lastUpdated as FirebaseFirestore.Timestamp)?.toDate().toISOString(),
    } as SupplierDocument;


    return NextResponse.json({ data: responseSupplier, message: 'Supplier created successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating supplier:', error);
    const message = error.message || 'Failed to create supplier.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';
import { CreateSupplierSchema } from '@/hooks/useSuppliers';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

// Firestore Index Suggestions for this route:
// 1. Default Listing & Name Search:
//    Collection: suppliers
//    Fields: companyId (ASC), deletedAt (ASC), name (ASC)
// 2. Filter by Reliability & Sort by Reliability then Name:
//    Collection: suppliers
//    Fields: companyId (ASC), deletedAt (ASC), reliabilityScore (DESC), name (ASC)
// 3. Filter by Lead Time & Sort by Lead Time then Name:
//    Collection: suppliers
//    Fields: companyId (ASC), deletedAt (ASC), leadTimeDays (ASC), name (ASC)

export async function GET(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Suppliers List] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Suppliers List] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const startAfterDocId = searchParams.get('startAfter'); 
  const searchTerm = searchParams.get('search');
  const reliabilityFilter = searchParams.get('reliability'); 
  const leadTimeFilter = searchParams.get('leadTime'); 

  try {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('suppliers')
                                                                        .where('companyId', '==', companyId)
                                                                        .where('deletedAt', '==', null);

    // Firestore requires that if you use a filter with an inequality comparison (<, <=, >, >=, !=, not-in),
    // your first orderBy clause must be on the same field.
    // For string range searches (name), orderBy('name') is implicitly needed.

    if (reliabilityFilter && reliabilityFilter !== 'all') {
      const [minRelStr, maxRelStr] = reliabilityFilter.split('-');
      const minRel = parseInt(minRelStr, 10);
      const maxRel = parseInt(maxRelStr, 10); // maxRel might be undefined if "85+"
      if (!isNaN(minRel)) query = query.where('reliabilityScore', '>=', minRel);
      if (!isNaN(maxRel)) query = query.where('reliabilityScore', '<=', maxRel);
      query = query.orderBy('reliabilityScore', 'desc').orderBy('name'); // Order by name as secondary for consistent pagination
    } else if (leadTimeFilter && leadTimeFilter !== 'all') {
      const [minLeadStr, maxLeadPlusStr] = leadTimeFilter.split('-');
      const minLead = parseInt(minLeadStr, 10);
      // For "15+", maxLead will be undefined or NaN.
      const maxLead = maxLeadPlusStr ? parseInt(maxLeadPlusStr.replace('+', ''), 10) : undefined;
      if (!isNaN(minLead)) query = query.where('leadTimeDays', '>=', minLead);
      if (maxLead !== undefined && !isNaN(maxLead)) query = query.where('leadTimeDays', '<=', maxLead);
      query = query.orderBy('leadTimeDays').orderBy('name'); // Order by name as secondary
    } else if (searchTerm) {
      query = query.orderBy('name').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
    } else {
      // Default sort if no specific filters demanding otherwise
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
        createdAt: (data.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        lastUpdated: (data.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
        lastOrderDate: data.lastOrderDate ? (data.lastOrderDate as admin.firestore.Timestamp).toDate().toISOString() : undefined,
        deletedAt: data.deletedAt ? (data.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
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
        error: 'Query requires an index. Please create the necessary composite index in Firestore. Details: ' + error.message + '. Suggested indexes are commented in the route file.',
        details: error.message
      }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch suppliers.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Suppliers Create] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Suppliers Create] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }

  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request); // This comes from request headers now
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

    const { productsSuppliedSkus, ...newSupplierDataFromPayload } = validationResult.data;
    
    const productsSupplied: SupplierProductInfo[] = (productsSuppliedSkus || []).map(sku => ({
        productId: sku, // Assuming SKU is the ProductID for now
        sku: sku, 
        name: `Product ${sku}`, // Placeholder name, should ideally be fetched or part of input
        // lastPrice, moqForItem, discountTiers would be undefined here unless part of a more complex input
    }));

    const supplierDocRef = db.collection('suppliers').doc();
    const fullSupplierData: Omit<SupplierDocument, 'id' | 'createdAt' | 'lastUpdated' | 'deletedAt'> & { createdAt: FirebaseFirestore.FieldValue, lastUpdated: FirebaseFirestore.FieldValue, createdBy: string, lastUpdatedBy: string } = {
      companyId,
      createdBy: userId,
      lastUpdatedBy: userId,
      ...newSupplierDataFromPayload,
      // Ensure optional fields from payload are handled
      leadTimeDays: newSupplierDataFromPayload.leadTimeDays ?? undefined,
      reliabilityScore: newSupplierDataFromPayload.reliabilityScore ?? undefined,
      moq: newSupplierDataFromPayload.moq ?? undefined,
      productsSupplied: productsSupplied,
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
      // Ensure other optional fields are correctly set to undefined if not present in payload
      email: newSupplierDataFromPayload.email || undefined,
      phone: newSupplierDataFromPayload.phone || undefined,
      address: newSupplierDataFromPayload.address || undefined,
      contactPerson: newSupplierDataFromPayload.contactPerson || undefined,
      paymentTerms: newSupplierDataFromPayload.paymentTerms || undefined,
      notes: newSupplierDataFromPayload.notes || undefined,
      logoUrl: undefined, // Not in CreateSupplierSchema
      lastOrderDate: undefined, // Not in CreateSupplierSchema
      totalSpend: undefined, // Not in CreateSupplierSchema
      onTimeDeliveryRate: undefined, // Not in CreateSupplierSchema
      qualityRating: undefined, // Not in CreateSupplierSchema
    };

    await supplierDocRef.set(fullSupplierData);
    const createdDoc = await supplierDocRef.get();
    const createdData = createdDoc.data();

    const responseSupplier = {
      id: createdDoc.id,
      ...createdData,
      createdAt: (createdData?.createdAt as admin.firestore.Timestamp)?.toDate().toISOString(),
      lastUpdated: (createdData?.lastUpdated as admin.firestore.Timestamp)?.toDate().toISOString(),
    } as SupplierDocument;

    return NextResponse.json({ data: responseSupplier, message: 'Supplier created successfully.' }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating supplier:', error);
    const message = error.message || 'Failed to create supplier.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


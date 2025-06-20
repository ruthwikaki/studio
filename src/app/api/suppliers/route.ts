
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { SupplierDocument, SupplierProductInfo } from '@/lib/types/firestore';
import { CreateSupplierSchema } from '@/hooks/useSuppliers';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

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

    if (searchTerm) {
      query = query.orderBy('name').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
    }

    if (reliabilityFilter && reliabilityFilter !== 'all') {
      const [minRelStr, maxRelStr] = reliabilityFilter.split('-');
      const minRel = parseInt(minRelStr, 10);
      const maxRel = parseInt(maxRelStr, 10);
      if (!isNaN(minRel)) query = query.where('reliabilityScore', '>=', minRel);
      if (!isNaN(maxRel)) query = query.where('reliabilityScore', '<=', maxRel);
      if (!searchTerm) query = query.orderBy('reliabilityScore', 'desc'); 
    }

    if (leadTimeFilter && leadTimeFilter !== 'all') {
      const [minLeadStr, maxLeadPlusStr] = leadTimeFilter.split('-');
      const minLead = parseInt(minLeadStr, 10);
      const maxLead = parseInt(maxLeadPlusStr, 10); 

      if (!isNaN(minLead)) query = query.where('leadTimeDays', '>=', minLead);
      if (!isNaN(maxLead)) { 
        query = query.where('leadTimeDays', '<=', maxLead);
      }
      if (!searchTerm && !reliabilityFilter) query = query.orderBy('leadTimeDays');
    }
    
    if (!searchTerm && !(reliabilityFilter && reliabilityFilter !== 'all') && !(leadTimeFilter && leadTimeFilter !== 'all')) {
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
        error: 'Query requires an index. Please create the necessary composite index in Firestore. Details: ' + error.message,
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
        productId: sku, sku: sku, name: `Product ${sku}`, 
    }));

    const supplierDocRef = db.collection('suppliers').doc();
    const fullSupplierData: Omit<SupplierDocument, 'id' | 'createdAt' | 'lastUpdated' | 'deletedAt'> & { createdAt: FirebaseFirestore.FieldValue, lastUpdated: FirebaseFirestore.FieldValue, createdBy: string, lastUpdatedBy: string } = {
      companyId,
      createdBy: userId,
      lastUpdatedBy: userId,
      ...newSupplierData,
      leadTimeDays: newSupplierData.leadTimeDays ?? undefined,
      reliabilityScore: newSupplierData.reliabilityScore ?? undefined,
      moq: newSupplierData.moq ?? undefined,
      productsSupplied: productsSupplied,
      createdAt: FieldValue.serverTimestamp(),
      lastUpdated: FieldValue.serverTimestamp(),
      email: newSupplierData.email || undefined,
      phone: newSupplierData.phone || undefined,
      address: newSupplierData.address || undefined,
      contactPerson: newSupplierData.contactPerson || undefined,
      paymentTerms: newSupplierData.paymentTerms || undefined,
      notes: newSupplierData.notes || undefined,
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

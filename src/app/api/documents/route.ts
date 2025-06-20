
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata, DocumentStatus } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

export async function GET(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Documents List] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Documents List] Firestore instance not available.");
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
  const type = searchParams.get('type') as DocumentMetadata['documentTypeHint'];
  const status = searchParams.get('status') as DocumentStatus;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const searchQuery = searchParams.get('search');

  try {
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('documents').where('companyId', '==', companyId);

    if (type && type !== 'auto_detect' && type !== 'unknown') {
      query = query.where('documentTypeHint', '==', type);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (dateFrom) {
      query = query.where('uploadedAt', '>=', admin.firestore.Timestamp.fromDate(new Date(dateFrom)));
    }
    if (dateTo) {
      const toDateObj = new Date(dateTo);
      toDateObj.setHours(23, 59, 59, 999);
      query = query.where('uploadedAt', '<=', admin.firestore.Timestamp.fromDate(toDateObj));
    }
    
    if (searchQuery) {
        query = query.orderBy('fileName').startAt(searchQuery).endAt(searchQuery + '\uf8ff');
    } else {
        query = query.orderBy('uploadedAt', 'desc');
    }

    if (startAfterDocId) {
      const startAfterDoc = await db.collection('documents').doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    const snapshot = await query.limit(limit).get();
    
    const documents: Partial<DocumentMetadata>[] = snapshot.docs.map(doc => {
      const data = doc.data() as DocumentMetadata;
      return {
        id: doc.id,
        fileName: data.fileName,
        fileType: data.fileType,
        status: data.status,
        documentTypeHint: data.documentTypeHint,
        uploadedAt: (data.uploadedAt as admin.firestore.Timestamp)?.toDate().toISOString(),
        processedAt: data.processedAt ? (data.processedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
        approvedAt: data.approvedAt ? (data.approvedAt as admin.firestore.Timestamp).toDate().toISOString() : undefined,
        extractedDataSummary: data.extractedData ? 
            `Type: ${data.extractedData.documentType || 'N/A'}, Ref: ${data.extractedData.invoiceNumber || data.extractedData.poNumber || data.extractedData.transactionId || 'N/A'}, Total: ${data.extractedData.totalAmount || 'N/A'}` 
            : "Not Extracted",
      };
    });
    
    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    
    return NextResponse.json({ 
        data: documents, 
        pagination: { 
            count: documents.length,
            nextCursor 
        } 
    });

  } catch (error: any) {
    console.error('Error fetching documents:', error);
     if (error.code === 'failed-precondition') {
      return NextResponse.json({ 
        error: 'Query requires an index. Please create the necessary composite index in Firestore.',
        details: error.message
      }, { status: 400 });
    }
    const message = error.message || 'Failed to fetch documents.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

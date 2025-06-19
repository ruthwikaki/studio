
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata, DocumentStatus } from '@/lib/types/firestore';

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
  const type = searchParams.get('type') as DocumentMetadata['documentTypeHint'];
  const status = searchParams.get('status') as DocumentStatus;
  const dateFrom = searchParams.get('dateFrom'); // ISO string
  const dateTo = searchParams.get('dateTo');     // ISO string
  const searchQuery = searchParams.get('search');

  try {
    let query: admin.firestore.Query<admin.firestore.DocumentData> = db.collection('documents').where('companyId', '==', companyId);

    if (type && type !== 'auto_detect' && type !== 'unknown') { // Assuming 'auto_detect' and 'unknown' mean no specific type filter
      query = query.where('documentTypeHint', '==', type);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (dateFrom) {
      query = query.where('uploadedAt', '>=', AdminTimestamp.fromDate(new Date(dateFrom)));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query = query.where('uploadedAt', '<=', AdminTimestamp.fromDate(toDate));
    }
    
    // Search: Firestore doesn't support native full-text search on nested objects like extractedData.
    // This search is simplified to fileName. For broader search, use a dedicated search service (e.g., Algolia, Elasticsearch).
    if (searchQuery) {
        // Basic prefix search on fileName. 
        query = query.orderBy('fileName').startAt(searchQuery).endAt(searchQuery + '\uf8ff');
    } else {
        query = query.orderBy('uploadedAt', 'desc'); // Default sort
    }


    const totalItemsSnapshot = await query.count().get();
    const totalItems = totalItemsSnapshot.data().count;
    const totalPages = Math.ceil(totalItems / limit);

    const paginatedQuery = query.limit(limit).offset((page - 1) * limit);
    const snapshot = await paginatedQuery.get();
    
    const documents: Partial<DocumentMetadata>[] = snapshot.docs.map(doc => {
      const data = doc.data() as DocumentMetadata;
      // Return a summary
      return {
        id: doc.id,
        fileName: data.fileName,
        fileType: data.fileType,
        status: data.status,
        documentTypeHint: data.documentTypeHint,
        uploadedAt: (data.uploadedAt as AdminTimestamp)?.toDate().toISOString(),
        processedAt: (data.processedAt as AdminTimestamp)?.toDate().toISOString(),
        approvedAt: (data.approvedAt as AdminTimestamp)?.toDate().toISOString(),
        // Simple summary of extracted data if available
        extractedDataSummary: data.extractedData ? 
            `Type: ${data.extractedData.documentType}, Ref: ${data.extractedData.invoiceNumber || data.extractedData.poNumber || data.extractedData.transactionId || 'N/A'}, Total: ${data.extractedData.totalAmount || 'N/A'}` 
            : "Not Extracted",
      };
    });
    
    return NextResponse.json({ 
        data: documents, 
        pagination: { currentPage: page, pageSize: limit, totalItems, totalPages } 
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


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, storageAdmin, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata } from '@/lib/types/firestore';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  let companyId: string;
  try {
    ({ companyId } = await verifyAuthToken(request));
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }
  
  const documentId = params.id;

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
  }

  try {
    const docRef = db.collection('documents').doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
    
    const data = docSnap.data() as DocumentMetadata;
    if (data.companyId !== companyId) {
      return NextResponse.json({ error: 'Access denied to this document.' }, { status: 403 });
    }

    // Convert Timestamps to ISO strings for JSON response
    const documentResponse = {
      ...data,
      id: docSnap.id,
      uploadedAt: (data.uploadedAt as AdminTimestamp)?.toDate().toISOString(),
      processedAt: data.processedAt ? (data.processedAt as AdminTimestamp).toDate().toISOString() : null,
      approvedAt: data.approvedAt ? (data.approvedAt as AdminTimestamp).toDate().toISOString() : null,
    };
    // Note: extractedData might contain its own Timestamps if not careful during extraction/storage.
    // For now, assuming Genkit flow output handles dates as strings or numbers.

    return NextResponse.json({ data: documentResponse });
  } catch (error: any) {
    console.error(`Error fetching document ${documentId}:`, error);
    const message = error.message || `Failed to fetch document ${documentId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed' }, { status: 401 });
  }
  
  const documentId = params.id;

  if (!documentId) {
    return NextResponse.json({ error: 'Document ID is required.' }, { status: 400 });
  }

  try {
    const docRef = db.collection('documents').doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
    const documentMetadata = docSnap.data() as DocumentMetadata;
    if (documentMetadata.companyId !== companyId) {
      return NextResponse.json({ error: 'Access denied to this document.' }, { status: 403 });
    }

    if (documentMetadata.status === 'approved') {
        return NextResponse.json({ error: 'Cannot delete an approved document.' }, { status: 400 });
    }

    // Delete from Firebase Storage
    if (documentMetadata.fileUrl) {
      try {
        const bucket = storageAdmin.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        // Extract path from URL: Assume format gs://<bucket-name>/<path-to-file> or https://storage.googleapis.com/<bucket-name>/<path-to-file>
        const urlParts = new URL(documentMetadata.fileUrl);
        let filePath = urlParts.pathname;
        // Remove leading bucket name if it's part of the pathname (common for public URLs)
        const bucketNameInPath = `/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/`;
        if (filePath.startsWith(bucketNameInPath)) {
            filePath = filePath.substring(bucketNameInPath.length);
        } else if (filePath.startsWith('/')) {
            filePath = filePath.substring(1); // Remove leading slash if any
        }
        
        if (filePath) {
            await bucket.file(filePath).delete();
        } else {
            console.warn(`Could not determine file path from URL: ${documentMetadata.fileUrl}`);
        }
      } catch (storageError: any) {
        // Log storage error but proceed to delete Firestore record if file not found or other minor issue
        console.error(`Error deleting file from storage for document ${documentId}: ${storageError.message}. Firestore record will still be deleted.`);
      }
    }

    // Delete from Firestore
    await docRef.delete();

    return NextResponse.json({ message: `Document ${documentId} and associated file deleted successfully.` });

  } catch (error: any) {
    console.error(`Error deleting document ${documentId}:`, error);
    const message = error.message || `Failed to delete document ${documentId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, getStorageAdmin, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata } from '@/lib/types/firestore';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminInitialized()) {
    console.error("[API Doc Detail GET] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Doc Detail GET] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
  }
  
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

    const documentResponse = {
      ...data,
      id: docSnap.id,
      uploadedAt: (data.uploadedAt as admin.firestore.Timestamp)?.toDate().toISOString(),
      processedAt: data.processedAt ? (data.processedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
      approvedAt: data.approvedAt ? (data.approvedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
      deletedAt: data.deletedAt ? (data.deletedAt as admin.firestore.Timestamp).toDate().toISOString() : null,
    };

    return NextResponse.json({ data: documentResponse });
  } catch (error: any) {
    console.error(`Error fetching document ${documentId}:`, error);
    const message = error.message || `Failed to fetch document ${documentId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminInitialized()) {
    console.error("[API Doc Detail DELETE] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  const storageAdmin = getStorageAdmin();
  if (!db || !storageAdmin) {
    console.error("[API Doc Detail DELETE] Firestore or Storage instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db/storage)." }, { status: 500 });
  }

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

    if (documentMetadata.fileUrl) {
      try {
        const bucket = storageAdmin.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        const urlParts = new URL(documentMetadata.fileUrl);
        let filePath = urlParts.pathname;
        const bucketNameInPath = `/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/`;
        if (filePath.startsWith(bucketNameInPath)) {
            filePath = filePath.substring(bucketNameInPath.length);
        } else if (filePath.startsWith('/')) {
            filePath = filePath.substring(1);
        }
        
        if (filePath) {
            await bucket.file(filePath).delete();
        } else {
            console.warn(`Could not determine file path from URL: ${documentMetadata.fileUrl}`);
        }
      } catch (storageError: any) {
        console.error(`Error deleting file from storage for document ${documentId}: ${storageError.message}. Firestore record will still be deleted.`);
      }
    }

    await docRef.delete();

    return NextResponse.json({ message: `Document ${documentId} and associated file deleted successfully.` });

  } catch (error: any) {
    console.error(`Error deleting document ${documentId}:`, error);
    const message = error.message || `Failed to delete document ${documentId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, getStorageAdmin, AdminTimestamp, FieldValue, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata } from '@/lib/types/firestore';
import { z } from 'zod';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const UploadRequestSchema = z.object({
  documentTypeHint: z.enum(['invoice', 'purchase_order', 'receipt', 'auto_detect', 'unknown']).optional().default('auto_detect'),
});

export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Doc Upload] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  const storageAdmin = getStorageAdmin();
  if (!db || !storageAdmin) {
    console.error("[API Doc Upload] Firestore or Storage instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db/storage)." }, { status: 500 });
  }

  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}. Supported types: PDF, PNG, JPG, JPEG.` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit.` }, { status: 400 });
    }

    const timestamp = Date.now();
    const storagePath = `documents/${companyId}/${timestamp}_${file.name}`;
    const bucket = storageAdmin.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET); 
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storageFile = bucket.file(storagePath);
    
    await storageFile.save(fileBuffer, {
      metadata: { contentType: file.type },
    });
    
    await storageFile.makePublic();
    const publicUrl = storageFile.publicUrl();

    const docRef = db.collection('documents').doc();
    const newDocumentData: Omit<DocumentMetadata, 'id'> = {
      companyId,
      uploadedBy: userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: publicUrl,
      status: 'uploaded',
      documentTypeHint: 'auto_detect',
      uploadedAt: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    await docRef.set(newDocumentData);
    await docRef.update({ status: 'pending_ocr' });

    return NextResponse.json({ 
        message: 'File uploaded successfully. Pending OCR and extraction.', 
        documentId: docRef.id,
        fileUrl: publicUrl,
    });

  } catch (error: any) {
    console.error('Error uploading document:', error);
    const message = error.message || 'Failed to upload document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

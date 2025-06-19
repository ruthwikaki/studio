
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, storageAdmin, AdminTimestamp, FieldValue } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata } from '@/lib/types/firestore';
import { z } from 'zod';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SUPPORTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

const UploadRequestSchema = z.object({
  documentTypeHint: z.enum(['invoice', 'purchase_order', 'receipt', 'auto_detect', 'unknown']).optional().default('auto_detect'),
  // Add other potential metadata from client here
});

export async function POST(request: NextRequest) {
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
    // const documentTypeHint = formData.get('documentTypeHint') as string || 'auto_detect'; // If sent as separate field

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    // Validate file type and size
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}. Supported types: PDF, PNG, JPG, JPEG.` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit.` }, { status: 400 });
    }

    const timestamp = Date.now();
    const storagePath = `documents/${companyId}/${timestamp}_${file.name}`;
    const bucket = storageAdmin.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET); // Ensure bucket name is in env
    
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storageFile = bucket.file(storagePath);
    
    await storageFile.save(fileBuffer, {
      metadata: { contentType: file.type },
    });
    
    // Make the file public for now, or use signed URLs in a real app
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
      status: 'uploaded', // Initial status
      documentTypeHint: 'auto_detect', // For now, or get from client if provided
      uploadedAt: FieldValue.serverTimestamp() as AdminTimestamp,
    };

    await docRef.set(newDocumentData);

    // Simulate triggering OCR processing: In a real app, this might be a Cloud Function trigger
    // For now, we can immediately update status to 'pending_ocr' or queue it.
    // Let's set to 'pending_ocr' to indicate next step for /process/[id] endpoint.
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


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata, AccountsPayableDocument, OrderDocument, InvoiceData, PurchaseOrderData } from '@/lib/types/firestore';

// Helper to create an Accounts Payable record
async function generatePayableRecord(invoiceDocMeta: DocumentMetadata, companyId: string, userId: string) {
    const invoiceData = invoiceDocMeta.extractedData as InvoiceData; // Assume it's InvoiceData
    if (!invoiceData || invoiceData.documentType !== 'invoice' || !invoiceData.totalAmount || !invoiceData.invoiceDate) {
        console.warn("Cannot generate payable record: Invoice data incomplete or not an invoice.", invoiceDocMeta.id);
        return null;
    }

    const dueDateString = invoiceData.dueDate || invoiceData.invoiceDate; // Default due date to invoice date if not present
    
    const apRef = db.collection('accounts_payable').doc();
    const newPayable: Omit<AccountsPayableDocument, 'id' | 'createdAt'> = {
        companyId,
        invoiceId: invoiceDocMeta.id,
        supplierName: invoiceData.vendorDetails?.name,
        invoiceNumber: invoiceData.invoiceNumber || `INV-${invoiceDocMeta.id.substring(0,6)}`,
        invoiceDate: AdminTimestamp.fromDate(new Date(invoiceData.invoiceDate)),
        dueDate: AdminTimestamp.fromDate(new Date(dueDateString)),
        totalAmount: invoiceData.totalAmount,
        amountPaid: 0,
        balanceDue: invoiceData.totalAmount,
        status: 'pending_payment',
        createdBy: userId,
    };
    await apRef.set({ ...newPayable, createdAt: FieldValue.serverTimestamp() });
    return apRef.id;
}


export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  let companyId: string, userId: string;
  try {
    const authResult = await verifyAuthToken(request);
    companyId = authResult.companyId;
    userId = authResult.uid;
  } catch (authError: any) {
    return NextResponse.json({ error: authError.message || 'Authentication failed.' }, { status: 401 });
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

    if (documentMetadata.status !== 'pending_review' && documentMetadata.status !== 'extraction_complete' && documentMetadata.status !== 'processed') {
        return NextResponse.json({ error: `Document cannot be approved. Current status: ${documentMetadata.status}. Expected pending_review, extraction_complete or processed.` }, { status: 400 });
    }

    const updates: Partial<DocumentMetadata> = {
      status: 'approved',
      approvedBy: userId,
      approvedAt: FieldValue.serverTimestamp() as AdminTimestamp,
      lastUpdatedBy: userId,
    };
    
    let actionMessage = 'Document approved successfully.';

    // Perform actions based on document type
    if (documentMetadata.extractedData?.documentType === 'invoice') {
        const apRecordId = await generatePayableRecord(documentMetadata, companyId, userId);
        if (apRecordId) {
            actionMessage += ` Accounts Payable record ${apRecordId} created.`;
        }
        if (documentMetadata.linkedPoId) {
            // Update status of the linked Purchase Order (OrderDocument)
            const poRef = db.collection('orders').doc(documentMetadata.linkedPoId);
            const poSnap = await poRef.get();
            if (poSnap.exists && poSnap.data()?.companyId === companyId) {
                await poRef.update({ 
                    status: 'completed', // Or a status like 'invoice_matched'
                    lastUpdated: FieldValue.serverTimestamp(),
                    lastUpdatedBy: userId,
                    notes: FieldValue.arrayUnion(`Matched with Invoice ${documentMetadata.id}`) 
                });
                 actionMessage += ` Linked PO ${documentMetadata.linkedPoId} status updated.`;
            }
        }
    } else if (documentMetadata.extractedData?.documentType === 'purchase_order') {
        // This assumes a PO document is approved before it becomes an actual order in 'orders' collection.
        // Or, it could update an existing OrderDocument that was created from this PO document.
        // For now, just logging.
        actionMessage += ' Purchase Order approved. (Further PO processing logic TBD).';
    }

    await docRef.update(updates);

    return NextResponse.json({ message: actionMessage, documentId });

  } catch (error: any) {
    console.error(`Error approving document ${documentId}:`, error);
    const message = error.message || `Failed to approve document ${documentId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

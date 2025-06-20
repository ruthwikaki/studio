
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, FieldValue, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import type { DocumentMetadata, OrderDocument, InvoiceData, PurchaseOrderData, POInvoiceMatchDocument, POInvoiceMatchDiscrepancy } from '@/lib/types/firestore';
import { z } from 'zod';
import { admin } from '@/lib/firebase/admin'; // For admin.firestore.Timestamp

const MatchRequestSchema = z.object({
  invoiceDocumentId: z.string().min(1, "Invoice Document ID is required"),
  poDocumentId: z.string().optional(),
  poOrderId: z.string().optional(),
}).refine(data => data.poDocumentId || data.poOrderId, {
  message: "Either PO Document ID or PO Order ID must be provided",
});

function calculatePOInvoiceMatch(
    invoiceMeta: DocumentMetadata, 
    poMeta?: DocumentMetadata, 
    poOrder?: OrderDocument
): { score: number; discrepancies: POInvoiceMatchDiscrepancy[] } {
    let score = 0;
    const discrepancies: POInvoiceMatchDiscrepancy[] = [];
    const invoiceData = invoiceMeta.extractedData as InvoiceData;
    const poData = poMeta?.extractedData as PurchaseOrderData | undefined || poOrder;

    if (!invoiceData || !poData) {
        discrepancies.push({ field: 'documents', poValue: !!poData, invoiceValue: !!invoiceData, difference: 'Missing extracted data for one or both documents.'});
        return { score: 0, discrepancies };
    }

    const invoiceVendor = invoiceData.vendorDetails?.name?.toLowerCase().trim();
    let poSupplierName: string | undefined;
    if (poMeta?.extractedData?.documentType === 'purchase_order') {
        poSupplierName = (poMeta.extractedData as PurchaseOrderData).supplierDetails?.name?.toLowerCase().trim();
    }

    if (invoiceVendor && poSupplierName && invoiceVendor === poSupplierName) {
        score += 20;
    } else if (invoiceVendor && poSupplierName) {
        discrepancies.push({ field: 'supplierName', poValue: poSupplierName, invoiceValue: invoiceVendor, difference: 'Supplier names do not match exactly.'});
        score += 5;
    }

    const invoiceTotal = invoiceData.totalAmount;
    const poTotal = (poMeta?.extractedData as PurchaseOrderData)?.totalAmount ?? poOrder?.totalAmount;

    if (invoiceTotal !== undefined && poTotal !== undefined) {
        const difference = Math.abs(invoiceTotal - poTotal);
        const tolerance = poTotal * 0.05;
        if (difference <= tolerance) {
            score += 50;
        } else {
            discrepancies.push({ field: 'totalAmount', poValue: poTotal, invoiceValue: invoiceTotal, difference: `Total amounts differ by more than 5%. Diff: ${difference.toFixed(2)}`});
            score += 10;
        }
    } else {
         discrepancies.push({ field: 'totalAmount', poValue: poTotal, invoiceValue: invoiceTotal, difference: 'Missing total amount on one or both documents.'});
    }

    const invoiceItemsCount = invoiceData.lineItems?.length || 0;
    const poItemsCount = (poMeta?.extractedData as PurchaseOrderData)?.items?.length || poOrder?.items?.length || 0;
    if (invoiceItemsCount > 0 && poItemsCount > 0) {
        score += Math.min(20, (Math.min(invoiceItemsCount, poItemsCount) / Math.max(invoiceItemsCount, poItemsCount)) * 20);
         if (invoiceItemsCount !== poItemsCount) {
            discrepancies.push({ field: 'lineItemCount', poValue: poItemsCount, invoiceValue: invoiceItemsCount, difference: 'Number of line items differs.'});
        }
    }
    return { score: Math.min(100, Math.round(score)), discrepancies };
}


export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    console.error("[API Match PO] Firebase Admin SDK not initialized.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const db = getDb();
  if (!db) {
    console.error("[API Match PO] Firestore instance not available.");
    return NextResponse.json({ error: "Server configuration error (no db)." }, { status: 500 });
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
    const body = await request.json();
    const validationResult = MatchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid request data.', details: validationResult.error.format() }, { status: 400 });
    }
    const { invoiceDocumentId, poDocumentId, poOrderId } = validationResult.data;

    const invoiceDocRef = db.collection('documents').doc(invoiceDocumentId);
    const invoiceDocSnap = await invoiceDocRef.get();
    if (!invoiceDocSnap.exists || (invoiceDocSnap.data() as DocumentMetadata).companyId !== companyId) {
      return NextResponse.json({ error: 'Invoice document not found or access denied.' }, { status: 404 });
    }
    const invoiceMetadata = invoiceDocSnap.data() as DocumentMetadata;
    if (invoiceMetadata.extractedData?.documentType !== 'invoice') {
        return NextResponse.json({ error: 'Specified document is not an invoice.' }, { status: 400 });
    }

    let poMetadata: DocumentMetadata | undefined;
    let poOrderData: OrderDocument | undefined;

    if (poDocumentId) {
        const poDocRef = db.collection('documents').doc(poDocumentId);
        const poDocSnap = await poDocRef.get();
        if (!poDocSnap.exists || (poDocSnap.data() as DocumentMetadata).companyId !== companyId) {
            return NextResponse.json({ error: 'PO document not found or access denied.' }, { status: 404 });
        }
        poMetadata = poDocSnap.data() as DocumentMetadata;
        if (poMetadata.extractedData?.documentType !== 'purchase_order') {
             return NextResponse.json({ error: 'Specified PO document is not a purchase order.' }, { status: 400 });
        }
    } else if (poOrderId) {
        const poOrderRef = db.collection('orders').doc(poOrderId);
        const poOrderSnap = await poOrderRef.get();
        if (!poOrderSnap.exists || (poOrderSnap.data() as OrderDocument).companyId !== companyId) {
            return NextResponse.json({ error: 'PO (Order) not found or access denied.' }, { status: 404 });
        }
        poOrderData = poOrderSnap.data() as OrderDocument;
        if (poOrderData.type !== 'purchase') {
            return NextResponse.json({ error: 'Specified order is not a purchase order.' }, { status: 400 });
        }
    }

    if (!poMetadata && !poOrderData) {
        return NextResponse.json({ error: 'Valid PO identifier not found.' }, { status: 400 });
    }

    const { score, discrepancies } = calculatePOInvoiceMatch(invoiceMetadata, poMetadata, poOrderData);

    const matchRef = db.collection('po_invoice_matches').doc();
    const newMatchData: Omit<POInvoiceMatchDocument, 'id'> = {
        companyId,
        invoiceId: invoiceDocumentId,
        poId: poDocumentId || poOrderId!,
        matchScore: score,
        matchDate: FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        matchedBy: 'user_manual',
        discrepancies,
        status: score >= 75 ? 'approved' : 'pending_review',
    };
    await matchRef.set(newMatchData);

    const batchWrite = db.batch();
    batchWrite.update(invoiceDocRef, { linkedPoId: poDocumentId || poOrderId, lastUpdatedBy: userId, lastUpdated: FieldValue.serverTimestamp() });
    if (poDocumentId) {
      batchWrite.update(db.collection('documents').doc(poDocumentId), { linkedInvoiceId: invoiceDocumentId, lastUpdatedBy: userId, lastUpdated: FieldValue.serverTimestamp() });
    }
    await batchWrite.commit();

    return NextResponse.json({ 
        message: 'PO and Invoice matched successfully.', 
        matchId: matchRef.id,
        matchScore: score,
        discrepancies 
    });

  } catch (error: any) {
    console.error('Error matching PO and Invoice:', error);
    const message = error.message || 'Failed to match documents.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

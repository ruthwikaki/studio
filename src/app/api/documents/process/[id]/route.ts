
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, FieldValue, AdminTimestamp } from '@/lib/firebase/admin';
import { verifyAuthToken } from '@/lib/firebase/admin-auth';
import { extractDocumentData, DocumentExtractionInput, DocumentExtractionOutput } from '@/ai/flows/documentExtraction';
import type { DocumentMetadata, OrderDocument } from '@/lib/types/firestore';
import { z } from 'zod';

const MOCK_OCR_TEXT_INVOICE = `
Invoice #: INV-2024-001
Vendor: ABC Supplies Inc.
Date: 2024-03-15
Due Date: 2024-04-15

Item            Qty  Price    Total
Blue T-Shirt    100  $10.00   $1000.00
Red Cap          50  $7.50    $375.00
Shipping                 $50.00
Tax                      $110.00
Total Amount: $1535.00
`;

const MOCK_OCR_TEXT_PO = `
Purchase Order #: PO-XYZ-789
Supplier: Tech Solutions LLC
Order Date: 2024-06-10
Expected Delivery: 2024-06-25

Item Description      SKU      Quantity  Unit Price  Line Total
Laptop Model X        LPX-01   5         800.00      4000.00
Wireless Mouse        WM-02    10        15.00       150.00
Subtotal: $4150.00
`;


// Simple helper to simulate a PO matching function
async function findAndMatchPOs(invoiceData: any, companyId: string): Promise<{ matchedPoId?: string; matchScore?: number; details?: string }> {
    if (!invoiceData || invoiceData.documentType !== 'invoice' || !invoiceData.vendorDetails?.name) {
        return { details: "Invoice data insufficient for PO matching." };
    }

    // Try to find POs from the same supplier with similar total amounts
    const potentialPOs = await db.collection('orders')
        .where('companyId', '==', companyId)
        .where('type', '==', 'purchase')
        // .where('supplierName', '==', invoiceData.vendorDetails.name) // Requires supplierName denormalized on OrderDocument or fetching supplier first
        .where('status', 'in', ['pending', 'awaiting_delivery', 'processing']) // Active POs
        .get();

    if (potentialPOs.empty) {
        return { details: `No active POs found for supplier like '${invoiceData.vendorDetails.name}'.` };
    }

    let bestMatch: { poId: string, score: number, poNumber?: string } | null = null;

    for (const poDoc of potentialPOs.docs) {
        const po = poDoc.data() as OrderDocument;
        let score = 0;
        // Basic matching: total amount within 10%
        if (invoiceData.totalAmount && po.totalAmount) {
            const diff = Math.abs(invoiceData.totalAmount - po.totalAmount) / po.totalAmount;
            if (diff <= 0.10) score += 70; // High score for amount match
            else if (diff <= 0.20) score += 40;
        }
        // TODO: Add line item comparison for better scoring
        
        if (bestMatch === null || score > bestMatch.score) {
            bestMatch = { poId: poDoc.id, score, poNumber: po.orderNumber };
        }
    }
    
    if (bestMatch && bestMatch.score >= 50) { // Threshold for a "good enough" match
        return { matchedPoId: bestMatch.poId, matchScore: bestMatch.score, details: `Potential match found with PO ${bestMatch.poNumber || bestMatch.poId} (Score: ${bestMatch.score})` };
    }
    return { details: "No strong PO match found based on current criteria." };
}


export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (documentMetadata.status !== 'pending_ocr' && documentMetadata.status !== 'uploaded' && documentMetadata.status !== 'ocr_complete') {
        // Allow reprocessing if already extracted but maybe user wants to re-hint
        if (documentMetadata.status !== 'extraction_complete' && documentMetadata.status !== 'pending_review') {
            return NextResponse.json({ error: `Document is not in a state to be processed. Current status: ${documentMetadata.status}` }, { status: 400 });
        }
    }
    
    await docRef.update({ status: 'processing_extraction', lastUpdatedBy: userId });

    // Simulate OCR - in real app, OCR text would be populated by a separate process.
    // Use documentTypeHint from metadata if available, otherwise default.
    const ocrText = documentMetadata.documentTypeHint === 'purchase_order' ? MOCK_OCR_TEXT_PO : MOCK_OCR_TEXT_INVOICE;
    // TODO: Store actual OCR text from an OCR service (e.g., Google Vision API) if available.

    const extractionInput: DocumentExtractionInput = {
      documentText: ocrText,
      documentTypeHint: documentMetadata.documentTypeHint || 'auto_detect',
      // userData: JSON.stringify({ knownSuppliers: ["ABC Supplies Inc.", "Tech Solutions LLC"] }), // Example user data
    };

    const extractionOutput: DocumentExtractionOutput = await extractDocumentData(extractionInput);
    
    const updatePayload: Partial<DocumentMetadata> & { processedAt: FirebaseFirestore.FieldValue, lastUpdatedBy: string } = {
      ocrText: ocrText, // Store the (mock) OCR text
      extractedData: extractionOutput as any, // Store the structured data
      extractionConfidence: extractionOutput.confidence?.overall,
      documentTypeHint: extractionOutput.documentType as DocumentMetadata['documentTypeHint'], // Update hint with AI's finding
      status: (extractionOutput.confidence?.overall || 0) < 0.7 ? 'pending_review' : 'extraction_complete',
      processedAt: FieldValue.serverTimestamp(),
      lastUpdatedBy: userId,
    };
    
    let poMatchResult: any = null;
    if (extractionOutput.documentType === 'invoice') {
      poMatchResult = await findAndMatchPOs(extractionOutput, companyId);
      if (poMatchResult.matchedPoId) {
        updatePayload.linkedPoId = poMatchResult.matchedPoId;
        // Optionally update the PO's linkedInvoiceId here or during approval
      }
    }

    await docRef.update(updatePayload);
    
    return NextResponse.json({ 
        message: 'Document processed successfully.', 
        extractedData: extractionOutput,
        poMatchDetails: poMatchResult,
        newStatus: updatePayload.status
    });

  } catch (error: any) {
    console.error(`Error processing document ${documentId}:`, error);
    await db.collection('documents').doc(documentId).update({ status: 'error', processingError: error.message, lastUpdatedBy: userId }).catch();
    const message = error.message || `Failed to process document ${documentId}.`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


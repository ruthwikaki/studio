
'use server';
/**
 * @fileOverview Genkit flow for extracting structured data from documents.
 *
 * - extractDocumentData - Function to process document text and extract data.
 * - DocumentExtractionInput - Input schema for the flow.
 * - DocumentExtractionOutput - Output schema for the flow (union of specific document types).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schemas for LineItems (common for Invoice, Purchase Order, Receipt)
const LineItemSchema = z.object({
  description: z.string().describe('Description of the line item.'),
  sku: z.string().optional().describe('Stock Keeping Unit, if available.'),
  quantity: z.number().optional().describe('Quantity of the item.'), // Made optional as it might not always be present or clear
  unitPrice: z.number().optional().describe('Unit price of the item.'), // Made optional
  total: z.number().optional().describe('Total price for this line item.'), // Made optional
});
export type LineItem = z.infer<typeof LineItemSchema>;

const ConfidenceSchema = z.object({
  overall: z.number().min(0).max(1).describe('Overall confidence in the extracted data (0.0 to 1.0).'),
  fields: z.record(z.string(), z.number().min(0).max(1)).optional().describe('Confidence score for specific critical fields (e.g., "total": 0.95, "invoiceNumber": 0.99). Key is the field path.'),
  unclearFields: z.array(z.string()).optional().describe("List of field paths (e.g., 'vendorDetails.name', 'lineItems[0].quantity') that were unclear or had low confidence."),
});
export type Confidence = z.infer<typeof ConfidenceSchema>;

// --- Invoice Schema ---
const VendorDetailsSchema = z.object({
  name: z.string().optional().describe('Vendor name.'),
  address: z.string().optional().describe('Vendor address.'),
  taxId: z.string().optional().describe('Vendor tax ID.'),
  phone: z.string().optional().describe('Vendor phone number.'),
  email: z.string().optional().describe('Vendor email address.'),
});

const InvoiceSchema = z.object({
  documentType: z.literal('invoice'),
  invoiceNumber: z.string().optional().describe('Invoice number.'),
  vendorDetails: VendorDetailsSchema.optional(),
  customerDetails: z.object({ // Added customer details as they are common on invoices
    name: z.string().optional().describe('Customer name.'),
    address: z.string().optional().describe('Customer billing or shipping address.'),
  }).optional(),
  invoiceDate: z.string().optional().describe('Invoice date (attempt YYYY-MM-DD).'),
  dueDate: z.string().optional().describe('Due date (attempt YYYY-MM-DD).'),
  lineItems: z.array(LineItemSchema).optional(),
  subtotal: z.number().optional().describe('Subtotal amount.'),
  taxAmount: z.number().optional().describe('Total tax amount.'), // Renamed for clarity
  taxRate: z.number().optional().describe('Tax rate if specified (e.g., 0.08 for 8%).'),
  shippingAmount: z.number().optional().describe('Shipping amount.'), // Renamed for clarity
  discountAmount: z.number().optional().describe('Discount amount, if any.'),
  totalAmount: z.number().optional().describe('Total amount due.'), // Renamed for clarity
  currency: z.string().optional().describe("Currency code (e.g., USD, EUR) or symbol (e.g., $). Try to infer from document."),
  paymentTerms: z.string().optional().describe('Payment terms (e.g., Net 30).'),
  notes: z.string().optional().describe("Any additional notes or comments from the invoice."),
  confidence: ConfidenceSchema,
});
export type InvoiceData = z.infer<typeof InvoiceSchema>;

// --- Purchase Order Schema ---
const PurchaseOrderSchema = z.object({
  documentType: z.literal('purchase_order'),
  poNumber: z.string().optional().describe('Purchase order number.'),
  orderDate: z.string().optional().describe('Order date (attempt YYYY-MM-DD).'),
  expectedDeliveryDate: z.string().optional().describe('Expected delivery date (attempt YYYY-MM-DD).'), // Renamed
  supplierDetails: VendorDetailsSchema.optional(), // Reused VendorDetails schema
  shippingAddress: z.string().optional().describe('Shipping address for the order.'),
  billingAddress: z.string().optional().describe('Billing address for the order.'),
  items: z.array(LineItemSchema).optional().describe('List of items in the purchase order.'),
  subtotal: z.number().optional().describe('Subtotal amount.'),
  taxAmount: z.number().optional().describe('Tax amount.'),
  shippingCost: z.number().optional().describe('Shipping cost.'),
  totalAmount: z.number().optional().describe('Total amount of the PO.'), // Renamed
  currency: z.string().optional().describe("Currency code (e.g., USD, EUR) or symbol."),
  status: z.string().optional().describe('Current status of the PO (e.g., pending, approved, shipped).'),
  approvedBy: z.string().optional().nullable().describe('Name or ID of the approver, if applicable.'),
  notes: z.string().optional().describe("Any additional notes or comments from the PO."),
  confidence: ConfidenceSchema,
});
export type PurchaseOrderData = z.infer<typeof PurchaseOrderSchema>;

// --- Receipt Schema ---
const ReceiptSchema = z.object({
    documentType: z.literal('receipt'),
    vendorName: z.string().optional().describe('Name of the vendor or store.'),
    vendorAddress: z.string().optional().describe('Address of the vendor or store.'),
    receiptDate: z.string().optional().describe('Date of the receipt (attempt YYYY-MM-DD).'),
    receiptTime: z.string().optional().describe('Time of the transaction, if available.'),
    lineItems: z.array(LineItemSchema).optional().describe('List of items purchased.'),
    subtotal: z.number().optional().describe('Subtotal amount.'),
    taxAmount: z.number().optional().describe('Tax amount.'), // Renamed
    tipAmount: z.number().optional().describe('Tip amount, if applicable.'), // Renamed
    totalAmount: z.number().optional().describe('Total amount paid.'),
    currency: z.string().optional().describe("Currency code (e.g., USD, EUR) or symbol."),
    paymentMethod: z.string().optional().describe('Method of payment (e.g., Credit Card ending in XXXX, Cash).'),
    transactionId: z.string().optional().describe('Transaction ID or reference number, if available.'),
    notes: z.string().optional().describe("Any additional notes or comments from the receipt."),
    confidence: ConfidenceSchema,
});
export type ReceiptData = z.infer<typeof ReceiptSchema>;


// --- Input and Output Schemas for the Flow ---
export const DocumentExtractionInputSchema = z.object({
  documentText: z.string().min(10, {message: "Document text must be at least 10 characters."}).describe('Text content of the document, typically from OCR.'),
  documentTypeHint: z.enum(['invoice', 'purchase_order', 'receipt', 'auto_detect']).default('auto_detect').describe('Hint for the document type. If "auto_detect", the AI will attempt to classify it.'),
  userData: z.string().optional().describe('Optional JSON string of company context (e.g., list of known supplier names, common SKU prefixes, expected date formats) to aid extraction accuracy.'),
});
export type DocumentExtractionInput = z.infer<typeof DocumentExtractionInputSchema>;

export const DocumentExtractionOutputSchema = z.discriminatedUnion('documentType', [
  InvoiceSchema,
  PurchaseOrderSchema,
  ReceiptSchema,
  z.object({
    documentType: z.literal('unknown'),
    reason: z.string().optional().describe("Reason why the document type is unknown or couldn't be processed."),
    extractedTextSummary: z.string().optional().describe("A brief summary of the text if type is unknown."),
    confidence: ConfidenceSchema.extend({
        overall: z.number().min(0).max(1).default(0.1)
    }),
  })
]);
export type DocumentExtractionOutput = z.infer<typeof DocumentExtractionOutputSchema>;

// Exported function
export async function extractDocumentData(input: DocumentExtractionInput): Promise<DocumentExtractionOutput> {
  return extractDocumentDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'documentExtractionPrompt',
  input: { schema: DocumentExtractionInputSchema },
  output: { schema: DocumentExtractionOutputSchema },
  prompt: `You are an AI assistant specialized in extracting structured information from text that has been OCR'd from documents.

Your primary task is to analyze the provided 'documentText'. Based on the 'documentTypeHint' and the content of the text:
1.  Determine the document type: 'invoice', 'purchase_order', or 'receipt'.
    - If 'documentTypeHint' is 'auto_detect' or not provided, you MUST determine the type.
    - If 'documentTypeHint' specifies a type, prioritize that unless the content overwhelmingly suggests otherwise (in which case, still use the hint but note the discrepancy in 'unclearFields' or confidence).
    - If the document type cannot be confidently determined or does not fit these categories, set 'documentType' to "unknown".
2.  Once the document type is determined, extract all relevant information and structure it strictly according to the corresponding Zod schema: InvoiceSchema for invoices, PurchaseOrderSchema for purchase orders, or ReceiptSchema for receipts.
3.  Dates: Attempt to parse all dates into YYYY-MM-DD format. If ambiguous or unparsable, return the date string as found on the document.
4.  Monetary Values: Extract all monetary values. For the 'currency' field, infer the currency from symbols (e.g., $, €, £) or context and provide the currency code (e.g., USD, EUR, GBP) or the symbol if the code is not clear.
5.  Line Items: For invoices, POs, and receipts, extract line items including description, SKU (if present), quantity, unit price, and total for each line. If these specific fields are not clearly distinguishable for an item, provide what information is available.
6.  Confidence Score:
    - 'overall': Provide an overall confidence score (0.0 to 1.0) for the accuracy and completeness of the entire extraction for the identified document type.
    - 'fields': (Optional) Provide confidence scores (0.0 to 1.0) for specific critical fields if you can assess them (e.g., "totalAmount": 0.98, "invoiceNumber": 0.90). Use JSON path for field keys.
    - 'unclearFields': List the JSON paths of any fields that were ambiguous, had low confidence, or where data might be missing or questionable (e.g., "vendorDetails.taxId", "lineItems[0].unitPrice").
7.  SKU Handling: If 'userData' is provided, it might contain context about common SKUs, supplier names, etc. Use this context to improve extraction accuracy if relevant. You are not performing database lookups, but use the context to guide extraction.
8.  Output Format: Your final output MUST be a single JSON object that strictly validates against the Zod schema corresponding to the 'documentType' you determine (InvoiceSchema, PurchaseOrderSchema, ReceiptSchema, or the schema for 'unknown').

Company Context/User Data (if provided):
\`\`\`json
{{{userData}}}
\`\`\`

Document Text (from OCR):
\`\`\`
{{{documentText}}}
\`\`\`

Analyze the document text and provide the structured JSON output.
If 'documentTypeHint' is '{{documentTypeHint}}', use this as a strong hint for the document type.
`,
  config: {
    temperature: 0.2, // Lower temperature for more deterministic extraction
    safetySettings: [
        {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH'},
        {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'},
        {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
        {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE'},
      ],
  }
});

const extractDocumentDataFlow = ai.defineFlow(
  {
    name: 'extractDocumentDataFlow',
    inputSchema: DocumentExtractionInputSchema,
    outputSchema: DocumentExtractionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);

    if (!output) {
      return {
        documentType: 'unknown',
        reason: "AI model did not return any output.",
        extractedTextSummary: input.documentText.substring(0, 200) + (input.documentText.length > 200 ? "..." : ""),
        confidence: { overall: 0.01, unclearFields: ["entire_document_extraction_failed"] },
      };
    }

    // Ensure a confidence object is always present, even if the LLM omits it.
    if (!output.confidence) {
      const defaultOverallConfidence = (output.documentType === 'invoice' || output.documentType === 'purchase_order' || output.documentType === 'receipt') ? 0.5 : 0.05;
      (output as any).confidence = { overall: defaultOverallConfidence, unclearFields: ["confidence_object_missing_from_llm_output"] };
    }


    return output;
  }
);

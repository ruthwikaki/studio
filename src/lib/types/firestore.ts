
// src/lib/types/firestore.ts
import type { Timestamp } from 'firebase/firestore';

// --------------------
// Companies Collection
// --------------------
export interface CompanySettings {
  currency?: string;
  timezone?: string;
  // Add other company-specific settings here
}

export interface CompanyDocument {
  id: string; // Firestore document ID
  name: string;
  plan: 'free' | 'starter' | 'pro';
  createdAt: Timestamp;
  settings?: CompanySettings;
  ownerId: string; // UID of the user who owns/created the company
}

// --------------------
// Users Collection
// --------------------
export interface UserSettings {
  notificationsEnabled?: boolean;
  prefersDarkMode?: boolean;
  // Add other user-specific settings here
}

export type UserRole = 'owner' | 'admin' | 'manager' | 'viewer';

export interface UserDocument {
  uid: string; // Firebase Auth UID, also used as Firestore document ID
  email: string | null;
  companyId: string; // Link to the companies collection document ID
  role: UserRole;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastSignInAt?: Timestamp;
  settings?: UserSettings;
}

// --------------------
// Products Collection (Master Product Information)
// --------------------
export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
  unit?: 'cm' | 'in' | 'm';
}

export interface ProductWeight {
  value?: number;
  unit?: 'kg' | 'lb';
}

export interface ProductDocument {
  id: string; // Firestore document ID
  companyId: string;
  sku: string; // Should be unique within a company
  name: string;
  description?: string;
  category?: string;
  basePrice: number; // Standard selling price
  cost: number; // Cost to acquire or manufacture
  imageUrl?: string;
  tags?: string[];
  dimensions?: ProductDimensions;
  weight?: ProductWeight;
  notes?: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  createdBy?: string; // UID of user who created it
  deletedAt?: Timestamp; // For soft deletes
}

// --------------------
// Inventory Collection (Stock Levels for Products)
// --------------------
export interface InventoryStockDocument {
  id: string; // Firestore document ID
  companyId: string;
  productId: string; // Reference to ProductDocument.id
  sku: string; // Denormalized from ProductDocument for easier querying
  name: string; // Denormalized product name
  quantity: number;
  unitCost: number; // Denormalized from product for valuation, or could be specific to batch
  reorderPoint: number;
  reorderQuantity?: number;
  location?: string; // e.g., Warehouse ID, shelf number
  lowStockAlertSent?: boolean; // Tracks if a low stock alert has been sent
  lastUpdated: Timestamp;
  lastUpdatedBy?: string; // UID of user who last updated
  createdAt?: Timestamp; // When the inventory item was first created
  createdBy?: string; // UID of user who created it
  notes?: string;
  category?: string; // Denormalized from ProductDocument
  imageUrl?: string; // Denormalized from ProductDocument
  leadTimeDays?: number; // Specific lead time for this item if different from supplier default
  onOrderQuantity?: number; // Quantity currently on order from suppliers
  deletedAt?: Timestamp; // For soft deletes
}

// --------------------
// Suppliers Collection
// --------------------
export interface SupplierAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface SupplierContactPerson {
  name?: string;
  email?: string;
  phone?: string;
}

export interface SupplierProductInfo {
  productId: string; // Reference to ProductDocument.id (master product SKU)
  sku: string; // Denormalized SKU
  name: string; // Denormalized product name
  lastPrice?: number; // Last price paid to this supplier for this product
  moqForItem?: number; // Minimum order quantity for this specific item from this supplier
}

export interface SupplierDocument {
  id: string; // Firestore document ID
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: SupplierAddress;
  contactPerson?: SupplierContactPerson;
  leadTimeDays?: number;
  reliabilityScore?: number; // e.g., 0-100
  paymentTerms?: string;
  moq?: number; // General Minimum Order Quantity for this supplier
  productsSupplied?: SupplierProductInfo[];
  notes?: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  createdBy?: string; // UID of user
  lastUpdatedBy?: string; // UID of user
  logoUrl?: string;
  lastOrderDate?: Timestamp;
  totalSpend?: number;
  onTimeDeliveryRate?: number; // 0.0 to 1.0
  qualityRating?: number; // e.g. 1-5
  deletedAt?: Timestamp; // For soft deletes
}

// --------------------
// Orders Collection
// --------------------
export interface OrderItem {
  productId: string; // Reference to ProductDocument.id
  sku: string; // Denormalized SKU
  name: string; // Denormalized product name
  quantity: number;
  unitPrice: number; // Price per unit for this order item
  totalCost: number; // quantity * unitPrice for this line
}

export type OrderStatus =
  | 'pending_approval' // For POs needing approval
  | 'pending_payment' // For sales orders awaiting payment
  | 'pending' // Generic pending state for POs
  | 'processing'
  | 'pending_fulfillment' // Sales order paid, ready to be picked/packed
  | 'awaiting_shipment' // PO placed, supplier to ship; or Sales order packed, ready for carrier
  | 'awaiting_delivery' // PO shipped by supplier; or Sales order shipped to customer
  | 'partially_shipped'
  | 'partially_delivered'
  | 'shipped'
  | 'delivered' // Received by warehouse (PO) or customer (SO)
  | 'completed' // All items accounted for, payment settled, etc.
  | 'cancelled'
  | 'disputed'
  | 'on_hold';

export interface OrderAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface OrderDocument {
  id: string; // Firestore document ID
  companyId: string;
  orderNumber: string; // User-friendly order number, should be unique per company/type
  type: 'purchase' | 'sales' | 'transfer'; // Transfer for moving stock between locations
  supplierId?: string; // For purchase orders
  customerId?: string; // For sales orders (could be a simple string or ref to a customers collection)
  items: OrderItem[];
  subtotalAmount?: number; // Sum of items' totalCost before taxes and shipping
  shippingCost?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number; // Grand total
  status: OrderStatus;
  orderDate: Timestamp;
  expectedDate?: Timestamp; // Expected delivery/shipment date
  actualDeliveryDate?: Timestamp;
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  trackingNumber?: string;
  shippingCarrier?: string;
  paymentMethod?: string;
  transactionId?: string; // For payment gateway reference
  notes?: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  createdBy?: string; // UID of user
  lastUpdatedBy?: string; // UID of user
  deletedAt?: Timestamp; // For soft deletes
}

// --------------------
// Sales History Collection
// --------------------
export interface SalesHistoryDocument {
  id: string; // Firestore document ID
  companyId: string;
  productId: string; // Reference to ProductDocument.id
  sku: string; // Denormalized SKU
  orderId?: string; // Reference to OrderDocument.id if sale originated from an order
  date: Timestamp; // Date of the sale transaction
  quantity: number;
  unitPrice: number; // Actual price per unit sold
  revenue: number; // quantity * unitPrice for this sale record
  costAtTimeOfSale?: number; // COGS for this item at the time of sale
  channel?: string; // e.g., 'Online Store', 'Retail POS', 'Marketplace'
  customerId?: string; // Identifier for the customer
  locationId?: string; // If sold from a specific retail location/warehouse
  notes?: string;
  deletedAt?: Timestamp; // For soft deletes
}

// --------------------
// Forecasts Collection
// --------------------
export interface ForecastPredictionPeriod {
  demand: number;
  confidence?: 'High' | 'Medium' | 'Low' | string;
  explanation?: string;
  confidenceInterval?: {
    lowerBound: number;
    upperBound: number;
  };
}

export interface ForecastDocument {
  id: string; // Firestore document ID
  companyId: string;
  productId: string; // Reference to ProductDocument.id (can be SKU if using SKU as product ID)
  sku: string; // Denormalized SKU
  modelType: string; // e.g., 'SIMPLE_MOVING_AVERAGE', 'AI_PATTERN_RECOGNITION'
  generatedAt: Timestamp;
  predictions: {
    '30day': ForecastPredictionPeriod; // Using direct keys from Genkit flow
    '60day': ForecastPredictionPeriod;
    '90day': ForecastPredictionPeriod;
  };
  accuracy?: number; // Overall accuracy score (e.g., MAPE, RMSE) if back-tested
  historicalDataUsedSummary?: string; // e.g., "Sales from YYYY-MM-DD to YYYY-MM-DD (90 data points)"
  notes?: string;
  createdBy?: string; // UID or system identifier
}

// --------------------
// Documents Collection (for Invoices, POs, Receipts etc.)
// --------------------
export type ExtractedDocumentData = any; // This will be the output of the Genkit flow (InvoiceData, PurchaseOrderData, etc.)

export type DocumentStatus =
  | 'uploading' // Initial state before file reaches server storage
  | 'uploaded' // File in storage, metadata created, pending further action
  | 'pending_ocr' // Queued for OCR processing
  | 'ocr_complete' // OCR text extracted, ready for data extraction
  | 'processing_extraction' // Genkit flow is running
  | 'extraction_complete' // Genkit flow finished, data extracted
  | 'pending_review' // Needs human review (e.g., low confidence, discrepancies)
  | 'processed' // Data verified/corrected, ready for system integration
  | 'approved' // Document formally approved (e.g., invoice for payment)
  | 'archived' // Document archived after processing
  | 'error'; // An error occurred at any stage

export interface DocumentMetadata {
  id: string; // Firestore document ID
  companyId: string;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // In bytes
  fileUrl: string; // URL to the file in Firebase Storage
  status: DocumentStatus;
  documentTypeHint?: 'invoice' | 'purchase_order' | 'receipt' | 'auto_detect' | 'unknown'; // User's hint or AI's classification
  extractedData?: ExtractedDocumentData;
  ocrText?: string; // Raw text from OCR
  extractionConfidence?: number; // Overall confidence from Genkit flow (0-1)
  processingError?: string; // If status is 'error'
  linkedPoId?: string; // For an invoice, the ID of the matched PO
  linkedInvoiceId?: string; // For a PO, the ID of the matched Invoice
  notes?: string;
  uploadedAt: Timestamp;
  processedAt?: Timestamp; // When Genkit flow finished
  approvedAt?: Timestamp;
  uploadedBy?: string; // UID of user
  lastUpdatedBy?: string; // UID of user
  approvedBy?: string; // UID of user
  deletedAt?: Timestamp; // For soft deletes
}

// --------------------
// PO Invoice Matches Collection (Explicit Matches)
// --------------------
export interface POInvoiceMatchDiscrepancy {
  field: string; // e.g., "lineItems[0].quantity", "totalAmount"
  poValue: any;
  invoiceValue: any;
  difference: string;
}
export interface POInvoiceMatchDocument {
    id: string; // Firestore document ID
    companyId: string;
    invoiceId: string; // Ref to DocumentMetadata (invoice)
    poId: string; // Ref to DocumentMetadata (PO) or OrderDocument (PO)
    matchScore: number; // 0-100
    matchDate: Timestamp;
    matchedBy: 'system_ai' | 'user_manual';
    discrepancies?: POInvoiceMatchDiscrepancy[];
    status: 'pending_review' | 'approved' | 'rejected';
    notes?: string;
}

// --------------------
// Accounts Payable Collection
// --------------------
export interface AccountsPayableDocument {
    id: string; // Firestore document ID
    companyId: string;
    invoiceId: string; // Ref to DocumentMetadata (invoice)
    supplierId?: string; // Ref to Suppliers collection
    supplierName?: string; // Denormalized
    invoiceNumber: string;
    invoiceDate: Timestamp;
    dueDate: Timestamp;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    status: 'pending_payment' | 'partially_paid' | 'paid' | 'overdue' | 'disputed';
    paymentDate?: Timestamp;
    paymentMethod?: string;
    transactionReference?: string;
    createdAt: Timestamp;
    createdBy?: string;
    notes?: string;
}


// --------------------
// Chat Sessions Collection
// --------------------
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp | Date; // Allow Date for easier client-side handling before Firestore conversion
}

export interface ChatSessionDocument {
  id: string; 
  companyId: string;
  userId: string; 
  messages: ChatMessage[];
  contextSnapshot?: string; // JSON string of the context provided to the AI for this session/turn
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  title?: string; // e.g., first user message, or AI generated title
  tags?: string[];
}

// --------------------
// Analytics Reports / Aggregates Collection
// --------------------
// Renamed AnalyticsDocument to DailyAggregateDocument for clarity
export interface DailyAggregateDocument {
    id: string; // e.g., daily_report_companyId_YYYY-MM-DD
    companyId: string;
    date: Timestamp; // The date this report pertains to
    totalInventoryValue: number;
    lowStockItemsCount: number;
    outOfStockItemsCount: number;
    todaysRevenue?: number; // If it's a daily report
    turnoverRate?: number; // Could be calculated and stored
    // Add other KPIs as needed
    // Example of category-based aggregation
    inventoryValueByCategory?: Record<string, number>;
    salesByProduct?: Record<string, { quantity: number; revenue: number }>;
    // ---
    lastCalculated: Timestamp; // When this report was generated/updated
    generatedBy?: string; // UID of user or 'system_aggregation_job'
}

// --------------------
// Counters Collection (for generating sequential numbers)
// --------------------
export interface CounterDocument {
    count: number;
}


// --------------------
// Notifications Collection
// --------------------
export type NotificationType = 
  | 'low_stock' 
  | 'order_status_changed' 
  | 'document_processed' 
  | 'supplier_score_updated'
  | 'new_forecast_available'
  | 'job_completed' // For background jobs
  | 'job_failed'
  | 'generic_alert';

export interface NotificationDocument {
  id: string;
  companyId: string;
  userId: string; // UID of the recipient, or 'all_managers', 'all_owners' etc. (logic to handle groups would be elsewhere)
  type: NotificationType;
  title: string;
  message: string;
  relatedResourceId?: string; // e.g., SKU, orderId, documentId, jobId
  relatedResourceType?: 'inventory' | 'order' | 'document' | 'supplier' | 'forecast' | 'job';
  isRead: boolean;
  createdAt: Timestamp;
  linkTo?: string; // URL path for quick navigation
}

// --------------------
// Activity Logs Collection
// --------------------
export type ActivityActionType = 
  | 'item_created' | 'item_updated' | 'item_deleted' | 'item_soft_deleted'
  | 'order_created' | 'order_status_updated' | 'order_deleted' | 'order_soft_deleted'
  | 'document_uploaded' | 'document_processed' | 'document_approved' | 'document_deleted' | 'document_soft_deleted'
  | 'supplier_created' | 'supplier_updated' | 'supplier_score_recalculated' | 'supplier_deleted' | 'supplier_soft_deleted'
  | 'forecast_requested' | 'forecast_generated' // Changed from forecast_generated
  | 'job_created' | 'job_status_updated'
  | 'user_login' | 'user_logout' // Example auth events
  | 'settings_changed';

export interface ActivityLogDocument {
  id: string;
  companyId: string;
  userId: string; // UID of the user who performed the action
  userEmail?: string; // Denormalized for easier display
  actionType: ActivityActionType;
  description: string; // e.g., "Updated quantity for SKU001 to 50 units"
  resourceType?: 'inventory' | 'order' | 'document' | 'supplier' | 'forecast' | 'user' | 'company_settings' | 'job';
  resourceId?: string; // ID of the affected resource
  details?: Record<string, any>; // e.g., { oldQuantity: 70, newQuantity: 50 }
  ipAddress?: string; // Client IP address (if obtainable)
  timestamp: Timestamp;
}

// --------------------
// User Cache Collection (Optional, for caching user data like companyId/role)
// --------------------
export interface UserCacheDocument {
    uid: string;
    companyId: string;
    role: UserRole;
    displayName?: string;
    email?: string;
    lastRefreshed: Timestamp;
}

// --------------------
// Job Queue Collection (for background processing)
// --------------------
export type JobType = 
    | 'generate_forecast'
    | 'generate_report'
    | 'bulk_import_inventory'
    | 'document_ocr_extraction'; // If OCR/extraction is also offloaded

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface JobQueueDocument<T = any> {
    id: string;
    companyId: string;
    userId?: string; // User who initiated the job, if applicable
    jobType: JobType;
    payload: T; // Job-specific data
    status: JobStatus;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
    result?: any; // Store successful result summary or link
    error?: string; // Store error message if failed
    retryCount?: number;
    maxRetries?: number;
    priority?: number; // 0 (highest) to N (lowest)
}

// Specific payload types for jobs
export interface GenerateForecastJobPayload {
    sku: string;
    seasonalityFactors?: string;
    modelType: string;
    // other relevant parameters from ForecastDemandInput
}

export interface DocumentOcrExtractionJobPayload {
    documentId: string; // ID of the document in 'documents' collection
    fileUrl: string;    // URL of the file in storage
    documentTypeHint?: string;
}

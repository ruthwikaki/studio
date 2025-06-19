
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

export interface UserDocument {
  uid: string; // Firebase Auth UID, also used as Firestore document ID
  email: string | null;
  companyId: string; // Link to the companies collection document ID
  role: 'owner' | 'admin' | 'manager' | 'viewer';
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
// Documents Collection
// --------------------
export type ExtractedDocumentData = any; 

export interface DocumentMetadata {
  id: string; 
  companyId: string;
  fileName: string;
  fileType: string; 
  fileSize: number; 
  fileUrl: string; 
  status: 'uploading' | 'pending_ocr' | 'ocr_complete' | 'processing_extraction' | 'extraction_complete' | 'pending_review' | 'processed' | 'error' | 'archived';
  documentTypeHint?: 'invoice' | 'purchase_order' | 'receipt' | 'auto_detect' | 'unknown';
  extractedData?: ExtractedDocumentData;
  linkedOrderId?: string; 
  notes?: string;
  uploadedAt: Timestamp;
  processedAt?: Timestamp; 
  uploadedBy?: string; 
  ocrConfidence?: number;
  extractionConfidence?: number; 
}

// --------------------
// Chat Sessions Collection
// --------------------
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
}

export interface ChatSessionDocument {
  id: string; 
  companyId: string;
  userId: string; 
  messages: ChatMessage[];
  context?: {
    loadedInventoryDataSummary?: string; 
    currentFocusSKU?: string; 
    activeFlows?: string[]; 
  };
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  title?: string; 
  tags?: string[];
}

// --------------------
// Analytics Reports Collection (for daily/periodic snapshots)
// --------------------
export interface AnalyticsDocument {
    id: string; // e.g., daily_report_companyId_YYYY-MM-DD
    companyId: string;
    date: Timestamp; // The date this report pertains to
    totalInventoryValue: number;
    lowStockItemsCount: number;
    outOfStockItemsCount: number;
    todaysRevenue?: number; // If it's a daily report
    turnoverRate?: number; // Could be calculated and stored
    // Add other KPIs as needed
    lastCalculated: Timestamp; // When this report was generated/updated
    generatedBy?: string; // UID of user or 'system'
}

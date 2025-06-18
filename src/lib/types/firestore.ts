// src/lib/types/firestore.ts
import type { Timestamp } from 'firebase/firestore';

// --------------------
// Companies Collection
// --------------------
export interface CompanyDocument {
  id: string; // Firestore document ID
  name: string;
  plan: 'free' | 'starter' | 'pro';
  createdAt: Timestamp;
  settings?: {
    // Company-specific settings
    timezone?: string;
    currency?: string;
  };
  ownerId: string; // UID of the user who owns/created the company
}

// --------------------
// Users Collection
// --------------------
export interface UserDocument {
  uid: string; // Firebase Auth UID, also used as Firestore document ID
  email: string | null;
  companyId: string; // Link to the companies collection document ID
  role: 'owner' | 'admin' | 'manager' | 'viewer'; // Role within the company
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastSignInAt?: Timestamp;
  settings?: {
    notificationsEnabled?: boolean;
    prefersDarkMode?: boolean;
  };
}

// --------------------
// Inventory Collection
// --------------------
export interface InventoryItemDocument {
  id: string; // Firestore document ID, can be same as sku if unique per company
  companyId: string; // Link to the company
  sku: string; // Stock Keeping Unit - should be unique per company
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  reorderQuantity?: number;
  supplierId?: string; // Link to suppliers collection document ID
  location?: string;
  category?: string;
  lastUpdated: Timestamp;
  lowStockAlertSent?: boolean;
  tags?: string[];
  imageUrl?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'in' | 'm';
  };
  weight?: {
    value?: number;
    unit?: 'kg' | 'lb';
  };
  createdBy?: string; // UID of user who created it
  notes?: string;
}

// --------------------
// Suppliers Collection
// --------------------
export interface SupplierProductInfo {
  productId: string; // SKU from inventory
  sku: string;
  name: string;
  lastPrice?: number;
  moqForItem?: number;
}

export interface SupplierDocument {
  id: string; // Firestore document ID
  companyId: string; // Link to the company
  name: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contactPerson?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  leadTimeDays?: number;
  reliabilityScore?: number; // Score from 0-100
  paymentTerms?: string;
  moq?: number;
  productsSupplied?: SupplierProductInfo[];
  notes?: string;
  lastOrderDate?: Timestamp;
  totalSpend?: number;
  onTimeDeliveryRate?: number;
  qualityRating?: number;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  createdBy?: string; // UID of user
}

// --------------------
// Orders Collection
// --------------------
export type OrderItem = {
  productId: string; // Link to inventory item document ID or SKU
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

export interface OrderDocument {
  id: string; // Firestore document ID
  companyId: string; // Link to the company
  orderNumber: string;
  type: 'purchase' | 'sales' | 'transfer';
  supplierId?: string;
  customerId?: string; // For sales orders
  items: OrderItem[];
  totalAmount: number;
  status:
    | 'pending'
    | 'awaiting_payment'
    | 'awaiting_shipment'
    | 'awaiting_delivery'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled'
    | 'disputed';
  orderDate: Timestamp;
  expectedDate?: Timestamp;
  actualDeliveryDate?: Timestamp;
  notes?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  trackingNumber?: string;
  shippingCost?: number;
  taxAmount?: number;
  discountAmount?: number;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  createdBy?: string; // UID of user
}

// --------------------
// Documents Collection
// (For OCR'd invoices, POs, receipts etc.)
// --------------------
export interface DocumentMetadata {
  id: string; // Firestore document ID
  companyId: string; // Link to the company
  fileName: string;
  fileType: string; // e.g., 'application/pdf', 'image/jpeg'
  fileSize: number; // in bytes
  fileUrl: string; // Cloud Storage URL
  extractedData?: any; // Store the structured data from Genkit (InvoiceData, PurchaseOrderData, etc.)
  status: 'uploading' | 'pending_ocr' | 'ocr_complete' | 'processing' | 'processed' | 'error' | 'archived';
  documentTypeHint?: 'invoice' | 'purchase_order' | 'receipt' | 'auto_detect' | 'unknown';
  linkedOrderId?: string; // Optional link to an order in the 'orders' collection
  notes?: string;
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
  uploadedBy?: string; // UID of user
  ocrConfidence?: number; // Overall confidence from OCR step if applicable
  extractionConfidence?: number; // Overall confidence from Genkit extraction step
}


// --------------------
// Analytics Collection
// --------------------
export interface AnalyticsDataPoint {
  date: Timestamp;
  totalInventoryValue: number;
  turnoverRate?: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  salesVolume?: number;
  purchaseVolume?: number;
}

export interface AnalyticsDocument {
  id: string; // e.g., 'companyId_summary' or 'daily_summary_YYYY-MM-DD_companyId'
  companyId: string;
  lastCalculated: Timestamp;
  currentTotalInventoryValue?: number;
  averageTurnoverRate?: number;
  topPerformingProducts?: Array<{ sku: string; name: string; value?: number; sales?: number }>;
  slowMovingProducts?: Array<{ sku: string; name: string; quantity: number; daysSinceLastSale?: number }>;
  insights?: Array<{
    id: string;
    text: string;
    type: 'info' | 'warning' | 'recommendation';
    generatedAt: Timestamp;
    relatedSkus?: string[];
  }>;
  historicalData?: AnalyticsDataPoint[];
}

// --------------------
// Chat Sessions Collection
// --------------------
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
  // Potentially 'toolCalls', 'toolResponses' if using Genkit tools
}

export interface ChatSessionDocument {
  id: string; // Firestore document ID
  companyId: string;
  userId: string; // User who initiated or is part of this session
  messages: ChatMessage[];
  context?: {
    loadedInventoryDataSummary?: string;
    currentFocus?: string;
  };
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  title?: string;
}
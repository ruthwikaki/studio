// src/lib/types/firestore.ts
import type { Timestamp } from 'firebase/firestore'; // Assuming you'll use Firebase Web SDK on client, or Admin SDK on server

// --------------------
// Users Collection
// --------------------
export interface UserProfile {
  uid: string;
  email: string | null;
  companyName?: string;
  role?: 'admin' | 'manager' | 'viewer';
  plan?: 'free' | 'pro' | 'enterprise';
  createdAt: Timestamp;
  settings?: {
    notificationsEnabled?: boolean;
    prefersDarkMode?: boolean;
    // other user-specific settings
  };
}

// --------------------
// Inventory Collection
// --------------------
export interface InventoryItemDocument {
  id: string; // Firestore document ID, can be same as sku if unique
  userId: string; // Link to the user/company (owner of this item)
  sku: string; // Stock Keeping Unit - should be unique per user
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  reorderPoint: number;
  reorderQuantity?: number; // How much to reorder when reorderPoint is hit
  supplierId?: string; // Link to suppliers collection document ID
  location?: string; // e.g., Warehouse A, Shelf B2
  category?: string;
  lastUpdated: Timestamp;
  lowStockAlertSent?: boolean; // To avoid sending multiple alerts
  tags?: string[]; // For better filtering/organization
  imageUrl?: string; // URL to product image
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
}

// --------------------
// Suppliers Collection
// --------------------
export interface SupplierDocument {
  id: string; // Firestore document ID
  userId: string; // Link to the user/company
  name: string;
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
  leadTimeDays?: number; // Average lead time in days
  reliability?: 'high' | 'medium' | 'low'; // Subjective or calculated
  productsSupplied?: Array<{ productId: string; sku: string; name: string }>; // List of product SKUs or IDs they supply
  notes?: string;
  lastOrderDate?: Timestamp;
  createdAt: Timestamp;
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
  userId: string; // Link to the user/company
  orderNumber: string; // User-friendly order number, should be unique per user
  type: 'purchase' | 'sale' | 'transfer'; // Type of order
  supplierId?: string; // For purchase orders, link to supplier document ID
  customerId?: string; // For sales orders
  items: OrderItem[];
  totalAmount: number;
  status:
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'completed';
  orderDate: Timestamp;
  expectedDate?: Timestamp; // Expected delivery/shipping date
  actualDeliveryDate?: Timestamp;
  notes?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  trackingNumber?: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
}

// --------------------
// Analytics Collection
// (This might be more of a summary document, updated periodically,
// or you might store raw data points if doing time-series analysis directly in Firestore,
// though specialized analytics databases are often better for complex queries)
// --------------------
export interface AnalyticsDataPoint {
  date: Timestamp; // The date for which this data point is recorded (e.g., end of day)
  totalInventoryValue: number;
  turnoverRate?: number; // Calculated for a period ending on this date
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  salesVolume?: number; // If tracking sales
  purchaseVolume?: number; // If tracking purchases
}

export interface AnalyticsDocument {
  id: string; // e.g., 'daily_summary_YYYY-MM-DD' or 'user_main_analytics'
  userId: string;
  lastCalculated: Timestamp;
  // KPIs that are snapshots or aggregated
  currentTotalInventoryValue?: number;
  averageTurnoverRate?: number; // e.g., last 30 days
  topPerformingProducts?: Array<{ sku: string; name: string; value?: number; sales?: number }>;
  slowMovingProducts?: Array<{ sku: string; name: string; quantity: number; daysSinceLastSale?: number }>;
  // AI Generated Insights (could be stored here or in a separate collection)
  insights?: Array<{
    id: string;
    text: string;
    type: 'info' | 'warning' | 'recommendation';
    generatedAt: Timestamp;
    relatedSkus?: string[];
  }>;
  // Potentially store a series of data points for charts if not too large
  historicalData?: AnalyticsDataPoint[]; // e.g., last 30-90 days for dashboard charts
}


// --------------------
// Chat Sessions Collection
// --------------------
export interface ChatMessage {
  role: 'user' | 'assistant'; // 'system' messages might be part of the initial prompt in the flow
  content: string;
  timestamp: Timestamp;
  // Potentially add more fields like 'toolCalls' or 'toolResponses' if using Genkit tools heavily
}

export interface ChatSessionDocument {
  id: string; // Firestore document ID
  userId: string;
  messages: ChatMessage[];
  context?: {
    // Information about the context of the chat
    loadedInventoryDataSummary?: string; // e.g., "Data from file X uploaded on Y"
    currentFocus?: string; // e.g., "Analyzing low stock items"
  };
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  title?: string; // Optional: user-defined or AI-generated title for the session
}

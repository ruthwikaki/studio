
// scripts/seedData.ts
import { db, AdminTimestamp, FieldValue, admin } from '../src/lib/firebase/admin'; // Import initialized admin components
import type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
import type {
  CompanyDocument, UserDocument, ProductDocument, InventoryStockDocument,
  SupplierDocument, OrderDocument, SalesHistoryDocument, ForecastDocument,
  DocumentMetadata, ChatSessionDocument, ChatMessage, OrderStatus, OrderItem,
  DailyAggregateDocument, DiscountTier
} from '../src/lib/types/firestore';

// --- Project ID Check (for logging purposes only, using the imported admin object) ---
let sdkProjectId: string | undefined;

if (admin.apps.length > 0 && admin.app().options && admin.app().options.projectId) {
    sdkProjectId = admin.app().options.projectId;
    console.log(`[Seed Script] Firebase Admin SDK appears to be initialized by admin.ts. Project ID from SDK: ${sdkProjectId}`);

    const expectedProjectId = "aria-jknbu"; 
    if (sdkProjectId !== expectedProjectId) {
        console.warn(`[Seed Script] WARNING: Initialized Admin SDK is for project '${sdkProjectId}', but expected '${expectedProjectId}'. Make sure this is intentional, and that 'service-account-key.json' in the project root corresponds to '${expectedProjectId}'.`);
    }
} else {
  console.error("--------------------------------------------------------------------");
  console.error("[Seed Script] CRITICAL ERROR: Firebase Admin SDK does not seem to be initialized by admin.ts, or project ID is not readable from the SDK instance.");
  if (admin.apps.length === 0) {
    console.error("  Reason: admin.apps.length is 0. The SDK is not initialized.");
  } else if (!admin.app().options) {
    console.error("  Reason: admin.app().options is undefined.");
  } else if (!admin.app().options.projectId) {
    console.error("  Reason: admin.app().options.projectId is undefined/empty.");
  }
  console.error("  This usually means that 'src/lib/firebase/admin.ts' failed to initialize.");
  console.error("  Please check the server startup logs for errors from 'admin.ts' related to 'service-account-key.json'.");
  console.error("  The 'service-account-key.json' file must be in the project root directory and be a valid key from your Firebase project.");
  console.error("--------------------------------------------------------------------");
  process.exit(1); 
}
// ------------------------------------------------------------------


console.log("--- Data Seeding Script for ARIA ---");

const MOCK_COMPANY_ID = 'comp_seed_co_001'; // Standardized ID
const MOCK_USER_ID_OWNER = 'user_owner_seed_001';
const MOCK_USER_ID_MANAGER = 'user_manager_seed_001';
const MOCK_PRODUCT_IDS: Record<string, string> = {};
const STORAGE_BUCKET_NAME = 'aria-jknbu.appspot.com'; 

const mockCompany: Omit<CompanyDocument, 'id' | 'createdAt'> & { id: string, createdAt: Date } = {
  id: MOCK_COMPANY_ID, // Uses standardized ID
  name: 'Seed Supply Co.', // Sample company name for the ARIA platform
  plan: 'pro',
  createdAt: new Date(),
  settings: { timezone: 'America/New_York', currency: 'USD' },
  ownerId: MOCK_USER_ID_OWNER,
};

const mockUsers: (Omit<UserDocument, 'uid' | 'createdAt'> & { uid: string, createdAt: Date })[] = [
  {
    uid: MOCK_USER_ID_OWNER,
    email: 'owner@seedsupply.example.com',
    companyId: MOCK_COMPANY_ID, // Uses standardized ID
    role: 'owner',
    displayName: 'Seed Co. Owner',
    createdAt: new Date(),
  },
  {
    uid: MOCK_USER_ID_MANAGER,
    email: 'manager@seedsupply.example.com',
    companyId: MOCK_COMPANY_ID, // Uses standardized ID
    role: 'manager',
    displayName: 'Seed Co. Manager',
    createdAt: new Date(),
  },
];

const mockProductsRaw: (Omit<ProductDocument, 'id' | 'companyId' | 'createdAt' | 'lastUpdated' | 'deletedAt'>)[] = [
  { sku: "LAPTOP001", name: "15in Pro Laptop", description: "High-performance laptop for professionals.", category: "Electronics", basePrice: 1299.99, cost: 850.00, imageUrl: "https://placehold.co/300x300.png?text=Laptop", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "MOUSE002", name: "Wireless Ergonomic Mouse", description: "Comfortable wireless mouse.", category: "Electronics", basePrice: 39.99, cost: 15.50, imageUrl: "https://placehold.co/300x300.png?text=Mouse", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "KEYB003", name: "Mechanical Keyboard", description: "RGB Mechanical Keyboard.", category: "Electronics", basePrice: 89.99, cost: 42.00, imageUrl: "https://placehold.co/300x300.png?text=Keyboard", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "MONITOR01", name: "27in 4K Monitor", description: "Ultra HD 27-inch monitor.", category: "Electronics", basePrice: 349.99, cost: 220.00, imageUrl: "https://placehold.co/300x300.png?text=Monitor", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "TSHIRT001", name: "Organic Cotton T-Shirt", description: "Plain white organic cotton t-shirt.", category: "Apparel", basePrice: 24.99, cost: 8.00, imageUrl: "https://placehold.co/300x300.png?text=TShirt", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "COFFEE001", name: "Premium Coffee Beans 1kg", description: "Whole bean dark roast.", category: "Groceries", basePrice: 19.99, cost: 10.50, imageUrl: "https://placehold.co/300x300.png?text=Coffee", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "BOOK001", name: "SCM Basics", description: "Introductory book on SCM.", category: "Books", basePrice: 49.99, cost: 20.00, imageUrl: "https://placehold.co/300x300.png?text=Book", createdBy: MOCK_USER_ID_MANAGER },
];

const mockProducts: (Omit<ProductDocument, 'id' | 'createdAt' | 'lastUpdated' | 'deletedAt'> & {id: string, createdAt: Date, lastUpdated: Date})[] = mockProductsRaw.map((p, index) => {
  const id = `prod_seed_${String(index + 1).padStart(3, '0')}`;
  MOCK_PRODUCT_IDS[p.sku] = id;
  return {
    id,
    companyId: MOCK_COMPANY_ID, // Uses standardized ID
    ...p,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    lastUpdated: new Date(),
  };
});


const mockInventoryStockRaw: (Omit<InventoryStockDocument, 'id' | 'companyId' | 'lastUpdated' | 'productId' | 'createdAt' | 'createdBy' | 'lastUpdatedBy' | 'deletedAt'>)[] = [
  { sku: "LAPTOP001", name: "15in Pro Laptop", quantity: 5, unitCost: 850.00, reorderPoint: 10, reorderQuantity: 5, location: "WH-A1", lowStockAlertSent: true, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Laptop" },
  { sku: "MOUSE002", name: "Wireless Ergonomic Mouse", quantity: 50, unitCost: 15.50, reorderPoint: 20, reorderQuantity: 25, location: "WH-A2", lowStockAlertSent: false, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Mouse" },
  { sku: "KEYB003", name: "Mechanical Keyboard", quantity: 2, unitCost: 42.00, reorderPoint: 5, reorderQuantity: 5, location: "WH-B1", lowStockAlertSent: true, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Keyboard" },
  { sku: "MONITOR01", name: "27in 4K Monitor", quantity: 0, unitCost: 220.00, reorderPoint: 3, reorderQuantity: 3, location: "WH-C1", lowStockAlertSent: true, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Monitor" },
  { sku: "TSHIRT001", name: "Organic Cotton T-Shirt", quantity: 150, unitCost: 8.00, reorderPoint: 50, reorderQuantity: 75, location: "WH-D1", lowStockAlertSent: false, category: "Apparel", imageUrl: "https://placehold.co/300x300.png?text=TShirt" },
  { sku: "COFFEE001", name: "Premium Coffee Beans 1kg", quantity: 75, unitCost: 10.50, reorderPoint: 30, reorderQuantity: 50, location: "WH-E1", lowStockAlertSent: false, category: "Groceries", imageUrl: "https://placehold.co/300x300.png?text=Coffee" },
  { sku: "BOOK001", name: "SCM Basics", quantity: 20, unitCost: 20.00, reorderPoint: 10, reorderQuantity: 10, location: "WH-F1", lowStockAlertSent: false, category: "Books", imageUrl: "https://placehold.co/300x300.png?text=Book" },
];

const mockInventoryStock: (Omit<InventoryStockDocument, 'id' | 'lastUpdated' | 'createdAt' | 'createdBy' | 'lastUpdatedBy' | 'deletedAt'> & {id: string, createdAt: Date, lastUpdated: Date, createdBy: string, lastUpdatedBy: string})[] = mockInventoryStockRaw.map((inv, index) => ({
  id: `inv_stock_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID, // Uses standardized ID
  productId: MOCK_PRODUCT_IDS[inv.sku],
  ...inv,
  createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
  lastUpdated: new Date(),
  createdBy: MOCK_USER_ID_MANAGER,
  lastUpdatedBy: MOCK_USER_ID_MANAGER,
}));

const laptopDiscountTiers: DiscountTier[] = [
    { minQuantity: 10, price: 830.00 },
    { minQuantity: 20, discountPercentage: 5 }, 
];
const monitorDiscountTiers: DiscountTier[] = [
    { minQuantity: 5, price: 205.00 },
    { minQuantity: 10, discountPercentage: 3 }, 
];
const mouseDiscountTiers: DiscountTier[] = [
    { minQuantity: 100, price: 14.50 },
    { minQuantity: 200, discountPercentage: 5 }, 
];


const mockSuppliersRaw: (Omit<SupplierDocument, 'id' | 'companyId' | 'createdAt' | 'lastUpdated' | 'deletedAt'>)[] = [
  {
    name: 'ElectroParts Ltd.',
    email: 'sales@electroparts.example.com',
    phone: '555-0101',
    leadTimeDays: 14,
    reliabilityScore: 92,
    paymentTerms: 'Net 30',
    productsSupplied: [
      { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: 'LAPTOP001', name: '15in Pro Laptop', lastPrice: 840.00, moqForItem: 5, discountTiers: laptopDiscountTiers },
      { productId: MOCK_PRODUCT_IDS["MONITOR01"], sku: 'MONITOR01', name: '27in 4K Monitor', lastPrice: 210.00, moqForItem: 3, discountTiers: monitorDiscountTiers },
    ],
    createdBy: MOCK_USER_ID_MANAGER,
    logoUrl: 'https://placehold.co/60x60.png?text=EL'
  },
  {
    name: 'General Goods Inc.',
    email: 'contact@generalgoods.example.com',
    phone: '555-0202',
    leadTimeDays: 7,
    reliabilityScore: 85,
    paymentTerms: 'Net 15',
    productsSupplied: [
      { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: 'MOUSE002', name: 'Wireless Ergonomic Mouse', lastPrice: 15.00, moqForItem: 50, discountTiers: mouseDiscountTiers },
      { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: 'KEYB003', name: 'Mechanical Keyboard', lastPrice: 40.00, moqForItem: 20 },
      { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: 'TSHIRT001', name: 'Organic Cotton T-Shirt', lastPrice: 7.50, moqForItem: 100 },
    ],
    createdBy: MOCK_USER_ID_MANAGER,
    logoUrl: 'https://placehold.co/60x60.png?text=GG'
  },
];

const mockSuppliers: (Omit<SupplierDocument, 'id' | 'createdAt' | 'lastUpdated' | 'deletedAt'> & {id: string, createdAt: Date, lastUpdated: Date})[] = mockSuppliersRaw.map((s, index) => ({
  id: `sup_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID, // Uses standardized ID
  ...s,
  createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
  lastUpdated: new Date(),
}));

type MockOrderRawItem = Omit<OrderDocument, 'id' | 'companyId' | 'createdAt' | 'lastUpdated' | 'orderDate' | 'expectedDate' | 'actualDeliveryDate' | 'deletedAt'> & {
  orderDate: Date;
  expectedDate?: Date;
  actualDeliveryDate?: Date;
};

const mockOrdersRaw: MockOrderRawItem[] = [
  {
    orderNumber: 'PO-2024-SEED-001',
    type: 'purchase',
    supplierId: mockSuppliers[0].id,
    items: [
      { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: 'LAPTOP001', name: '15in Pro Laptop', quantity: 10, unitPrice: 845.00, totalCost: 8450.00 },
      { productId: MOCK_PRODUCT_IDS["MONITOR01"], sku: 'MONITOR01', name: '27in 4K Monitor', quantity: 5, unitPrice: 215.00, totalCost: 1075.00 },
    ],
    totalAmount: 9525.00,
    status: 'delivered' as OrderStatus,
    orderDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    expectedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    actualDeliveryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdBy: MOCK_USER_ID_MANAGER,
  },
  {
    orderNumber: 'SO-2024-SEED-001',
    type: 'sales',
    customerId: 'cust_retail_001',
    items: [
      { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: 'MOUSE002', name: 'Wireless Ergonomic Mouse', quantity: 2, unitPrice: 39.99, totalCost: 79.98 },
      { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: 'KEYB003', name: 'Mechanical Keyboard', quantity: 1, unitPrice: 89.99, totalCost: 89.99 },
    ],
    totalAmount: 169.97,
    status: 'completed' as OrderStatus,
    orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    actualDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    createdBy: MOCK_USER_ID_MANAGER,
  },
];

type MockOrderProcessed = Omit<OrderDocument, 'id' | 'createdAt' | 'lastUpdated' | 'orderDate' | 'expectedDate' | 'actualDeliveryDate' | 'deletedAt'> & {
  id: string;
  orderDate: Date;
  expectedDate?: Date;
  actualDeliveryDate?: Date;
  createdAt: Date;
  lastUpdated: Date;
};

const mockOrders: MockOrderProcessed[] = mockOrdersRaw.map((o, index) => ({
  id: `ord_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID, // Uses standardized ID
  ...o,
  orderDate: o.orderDate,
  expectedDate: o.expectedDate,
  actualDeliveryDate: o.actualDeliveryDate,
  createdAt: o.orderDate,
  lastUpdated: o.actualDeliveryDate || o.orderDate,
}));


const mockSalesHistoryRaw: (Omit<SalesHistoryDocument, 'id' | 'companyId' | 'date' | 'productId' | 'deletedAt'> & {skuForLookup: string, orderId?: string, date: Date})[] = [
  { skuForLookup: "MOUSE002", orderId: mockOrders[1].id, date: mockOrders[1].orderDate, quantity: 2, unitPrice: 39.99, revenue: 79.98, costAtTimeOfSale: 15.50 * 2, channel: 'Online Store', customerId: 'cust_retail_001' },
  { skuForLookup: "KEYB003", orderId: mockOrders[1].id, date: mockOrders[1].orderDate, quantity: 1, unitPrice: 89.99, revenue: 89.99, costAtTimeOfSale: 42.00 * 1, channel: 'Online Store', customerId: 'cust_retail_001' },
  { skuForLookup: "LAPTOP001", date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), quantity: 1, unitPrice: 1299.99, revenue: 1299.99, costAtTimeOfSale: 850.00 * 1, channel: 'Direct Sale' }, 
  { skuForLookup: "TSHIRT001", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), quantity: 10, unitPrice: 24.99, revenue: 249.90, costAtTimeOfSale: 8.00 * 10, channel: 'Retail POS' }, 
  { skuForLookup: "TSHIRT001", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), quantity: 5, unitPrice: 24.99, revenue: 124.95, costAtTimeOfSale: 8.00 * 5, channel: 'Online Store' }, 
];

const mockSalesHistory: (Omit<SalesHistoryDocument, 'id' | 'date' | 'deletedAt'> & {id: string, date: Date})[] = mockSalesHistoryRaw.map((s, index) => ({
  id: `sh_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID, // Uses standardized ID
  productId: MOCK_PRODUCT_IDS[s.skuForLookup],
  sku: s.skuForLookup,
  orderId: s.orderId || null, 
  quantity: s.quantity,
  unitPrice: s.unitPrice,
  revenue: s.revenue,
  costAtTimeOfSale: s.costAtTimeOfSale,
  channel: s.channel,
  customerId: s.customerId || null, 
  date: s.date,
}));

const mockForecastsRaw: (Omit<ForecastDocument, 'id' | 'companyId' | 'generatedAt' | 'productId'> & {skuForLookup: string})[] = [
  {
    skuForLookup: 'LAPTOP001',
    modelType: 'AI_PATTERN_RECOGNITION',
    predictions: {
      '30day': { demand: 8, confidence: 'Medium', confidenceInterval: { lowerBound: 6, upperBound: 10 } },
      '60day': { demand: 15, confidence: 'Medium', confidenceInterval: { lowerBound: 12, upperBound: 18 } },
      '90day': { demand: 22, confidence: 'Low', confidenceInterval: { lowerBound: 17, upperBound: 27 } },
    },
    accuracy: 85,
    createdBy: 'system_ai_process',
  },
  {
    skuForLookup: 'MOUSE002',
    modelType: 'EXPONENTIAL_SMOOTHING',
    predictions: {
      '30day': { demand: 40, confidence: 'High', confidenceInterval: { lowerBound: 35, upperBound: 45 } },
      '60day': { demand: 85, confidence: 'High', confidenceInterval: { lowerBound: 78, upperBound: 92 } },
      '90day': { demand: 120, confidence: 'Medium', confidenceInterval: { lowerBound: 110, upperBound: 130 } },
    },
    accuracy: 92,
    createdBy: 'system_ai_process',
  },
];

const mockForecasts: (Omit<ForecastDocument, 'id' | 'generatedAt'> & {id: string, generatedAt: Date})[] = mockForecastsRaw.map((fc, index) => ({
    id: `fc_seed_${String(index + 1).padStart(3, '0')}`,
    companyId: MOCK_COMPANY_ID, // Uses standardized ID
    productId: MOCK_PRODUCT_IDS[fc.skuForLookup],
    sku: fc.skuForLookup,
    modelType: fc.modelType,
    predictions: fc.predictions,
    accuracy: fc.accuracy,
    createdBy: fc.createdBy,
    generatedAt: new Date(),
}));

const mockDocumentsRaw: (Omit<DocumentMetadata, 'id' | 'companyId' | 'uploadedAt' | 'processedAt' | 'deletedAt'>)[] = [
  {
    fileName: 'invoice_electroparts_2024_03.pdf',
    fileType: 'application/pdf',
    fileSize: 123456,
    fileUrl: `gs://${STORAGE_BUCKET_NAME}/documents/${MOCK_COMPANY_ID}/invoice_electroparts_2024_03.pdf`,
    status: 'processed',
    documentTypeHint: 'invoice',
    extractedData: { documentType: "invoice", invoiceNumber: "INV-EP-789", totalAmount: 9525.00, vendorName: "ElectroParts Ltd." },
    linkedPoId: mockOrders[0].id,
    uploadedBy: MOCK_USER_ID_MANAGER,
    extractionConfidence: 0.95,
  },
  {
    fileName: 'po_to_generalgoods_march.png',
    fileType: 'image/png',
    fileSize: 78910,
    fileUrl: `gs://${STORAGE_BUCKET_NAME}/documents/${MOCK_COMPANY_ID}/po_to_generalgoods_march.png`,
    status: 'pending_review',
    documentTypeHint: 'purchase_order',
    extractedData: { documentType: "purchase_order", poNumber: "PO-GG-102", totalAmount: 550.00, supplierDetails: { name: "General Goods Inc."} },
    uploadedBy: MOCK_USER_ID_MANAGER,
    extractionConfidence: 0.88,
  },
];

const mockDocuments: (Omit<DocumentMetadata, 'id' | 'uploadedAt' | 'processedAt' | 'deletedAt'> & {id: string, uploadedAt: Date, processedAt?: Date})[] = mockDocumentsRaw.map((doc, index) => ({
    id: `doc_seed_${String(index + 1).padStart(3, '0')}`,
    companyId: MOCK_COMPANY_ID, // Uses standardized ID
    ...doc,
    uploadedAt: new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000),
    processedAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000),
}));

const mockChatSessionsRaw: (Omit<ChatSessionDocument, 'id' | 'companyId' | 'createdAt' | 'lastMessageAt' | 'messages'> & { messages: Omit<ChatMessage, 'timestamp'>[] })[] = [
  {
    userId: MOCK_USER_ID_OWNER,
    messages: [
      { role: 'user', content: 'Which items are running low?' },
      { role: 'assistant', content: 'Currently, LAPTOP001 (5 units), KEYB003 (2 units), and MONITOR01 (0 units) are below their reorder points.' },
    ],
    contextSnapshot: `{"inventorySummary":{"totalItems":7,"totalValue":12345},"lowStockItems":[{"sku":"LAPTOP001","name":"15in Pro Laptop","quantity":5,"reorderPoint":10},{"sku":"KEYB003","name":"Mechanical Keyboard","quantity":2,"reorderPoint":5},{"sku":"MONITOR01","name":"27in 4K Monitor","quantity":0,"reorderPoint":3}]}`,
    title: 'Low Stock Inquiry',
  },
];

const mockChatSessions: (Omit<ChatSessionDocument, 'id' | 'createdAt' | 'lastMessageAt' | 'messages'> & {id: string, createdAt: Date, lastMessageAt: Date, messages: ChatMessage[]})[] = mockChatSessionsRaw.map((chat, index) => {
  let messageTime = Date.now() - 120000; 
  const processedMessages: ChatMessage[] = chat.messages.map((rawMsg, msgIndex) => {
      messageTime += (msgIndex * 5000); 
      return {
          ...rawMsg,
          timestamp: AdminTimestamp.fromDate(new Date(messageTime)) 
      };
  });

  return {
    id: `chat_seed_${String(index + 1).padStart(3, '0')}`,
    companyId: MOCK_COMPANY_ID, // Uses standardized ID
    userId: chat.userId,
    title: chat.title,
    contextSnapshot: chat.contextSnapshot,
    messages: processedMessages, 
    createdAt: new Date(Date.now() - (index + 2) * 60 * 60 * 1000),
    lastMessageAt: new Date(Date.now() - (index + 1) * 59 * 60 * 1000),
  };
});


const mockDailyAggregate: Omit<DailyAggregateDocument, 'id' | 'date' | 'lastCalculated'> & { date: Date; lastCalculated: Date } = {
  companyId: MOCK_COMPANY_ID, // Uses standardized ID
  date: new Date(),
  totalInventoryValue: mockInventoryStock.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
  lowStockItemsCount: mockInventoryStock.filter(item => item.quantity <= item.reorderPoint && item.reorderPoint > 0).length,
  outOfStockItemsCount: mockInventoryStock.filter(item => item.quantity === 0).length,
  todaysRevenue: mockSalesHistory
    .filter(sale => {
        const saleDate = sale.date;
        const today = new Date();
        return saleDate.getUTCFullYear() === today.getUTCFullYear() &&
               saleDate.getUTCMonth() === today.getUTCMonth() &&
               saleDate.getUTCDate() === today.getUTCDate();
    })
    .reduce((sum, sale) => sum + sale.revenue, 0),
  inventoryValueByCategory: mockInventoryStock.reduce((acc, item) => {
    const category = item.category || 'Uncategorized';
    acc[category] = (acc[category] || 0) + (item.quantity * item.unitCost);
    return acc;
  }, {} as Record<string, number>),
  lastCalculated: new Date(),
  generatedBy: 'seed_script',
};


async function seedDatabase() {
  console.log(`[Seed Script] Using Project ID for Firestore operations: ${sdkProjectId}`);
  if (!sdkProjectId) {
    console.error("[Seed Script] CRITICAL: Project ID is undefined. Cannot proceed with Firestore operations.");
    process.exit(1);
  }

  try {
    console.log(`[Seed Script] Attempting a diagnostic write to project ${sdkProjectId}, (default) database...`);
    const diagnosticDocRef = db.collection('_seed_diagnostics').doc(`test_write_default_db_${Date.now()}`);
    await diagnosticDocRef.set({
        timestamp: FieldValue.serverTimestamp(),
        message: `Seed script diagnostic write for project ${sdkProjectId} to (default) database`,
        sdkInitializedProjectId: sdkProjectId,
    });
    console.log(`[Seed Script] Diagnostic write SUCCESSFUL to collection '_seed_diagnostics' in (default) database.`);
  } catch (diagError: any) {
    console.error(`[Seed Script] CRITICAL ERROR during diagnostic write to (default) database:`, diagError);
    console.error("  This means basic Firestore write operations are failing for the (default) database.");
    process.exit(1); 
  }

  console.log(`Connecting to Firestore (default) database...`);
  const batch = db.batch();

  console.log("Seeding data to Firestore collections:");

  console.log(`Seeding company: ${mockCompany.name} with ID: ${mockCompany.id}`);
  const companyDocRef = db.collection('companies').doc(mockCompany.id);
  batch.set(companyDocRef, { ...mockCompany, createdAt: AdminTimestamp.fromDate(mockCompany.createdAt) });

  console.log(`Seeding ${mockUsers.length} users... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockUsers.forEach(user => {
    const userDocRef = db.collection('users').doc(user.uid);
    batch.set(userDocRef, { ...user, createdAt: AdminTimestamp.fromDate(user.createdAt) });
  });

  console.log(`Seeding ${mockProducts.length} products... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockProducts.forEach(product => {
    const productDocRef = db.collection('products').doc(product.id);
    batch.set(productDocRef, { ...product, createdAt: AdminTimestamp.fromDate(product.createdAt), lastUpdated: AdminTimestamp.fromDate(product.lastUpdated), deletedAt: null });
  });

  console.log(`Seeding ${mockInventoryStock.length} inventory stock records... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockInventoryStock.forEach(item => {
    const itemDocRef = db.collection('inventory').doc(item.id);
    batch.set(itemDocRef, { ...item, createdAt: AdminTimestamp.fromDate(item.createdAt), lastUpdated: AdminTimestamp.fromDate(item.lastUpdated), deletedAt: null });
  });

  console.log(`Seeding ${mockSuppliers.length} suppliers... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockSuppliers.forEach(supplier => {
    const supplierDocRef = db.collection('suppliers').doc(supplier.id);
    batch.set(supplierDocRef, { ...supplier, createdAt: AdminTimestamp.fromDate(supplier.createdAt), lastUpdated: AdminTimestamp.fromDate(supplier.lastUpdated), deletedAt: null });
  });

  console.log(`Seeding ${mockOrders.length} orders... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockOrders.forEach(order => {
    const orderDocRef = db.collection('orders').doc(order.id);
    const { expectedDate, actualDeliveryDate, ...restOfOrder } = order;

    const firestoreOrderData: any = {
      ...restOfOrder,
      orderDate: AdminTimestamp.fromDate(order.orderDate),
      createdAt: AdminTimestamp.fromDate(order.createdAt),
      lastUpdated: AdminTimestamp.fromDate(order.lastUpdated),
      deletedAt: null,
    };

    if (expectedDate) {
      firestoreOrderData.expectedDate = AdminTimestamp.fromDate(expectedDate);
    }
    if (actualDeliveryDate) {
      firestoreOrderData.actualDeliveryDate = AdminTimestamp.fromDate(actualDeliveryDate);
    }

    batch.set(orderDocRef, firestoreOrderData);
  });

  console.log(`Seeding ${mockSalesHistory.length} sales history records... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockSalesHistory.forEach(sh => {
    const shDocRef = db.collection('sales_history').doc(sh.id);
    const salesHistoryData = {
      ...sh,
      date: AdminTimestamp.fromDate(sh.date),
      orderId: sh.orderId,
      customerId: sh.customerId,
      deletedAt: null
    };
    batch.set(shDocRef, salesHistoryData);
  });

  console.log(`Seeding ${mockForecasts.length} forecasts... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockForecasts.forEach(fc => {
    const fcDocRef = db.collection('forecasts').doc(fc.id);
    batch.set(fcDocRef, { ...fc, generatedAt: AdminTimestamp.fromDate(fc.generatedAt) });
  });

  console.log(`Seeding ${mockDocuments.length} document metadata entries... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockDocuments.forEach(doc => {
    const docRef = db.collection('documents').doc(doc.id);
    const { processedAt, ...restOfDoc } = doc;

    const firestoreDocumentData: any = {
      ...restOfDoc,
      uploadedAt: AdminTimestamp.fromDate(doc.uploadedAt),
      deletedAt: null,
    };
    if (processedAt) {
      firestoreDocumentData.processedAt = AdminTimestamp.fromDate(processedAt);
    }
    batch.set(docRef, firestoreDocumentData);
  });

  console.log(`Seeding ${mockChatSessions.length} chat sessions... Each for company ID: ${MOCK_COMPANY_ID}`);
  mockChatSessions.forEach(chat => {
    const chatRef = db.collection('chat_sessions').doc(chat.id);
    batch.set(chatRef, {
        companyId: chat.companyId, // Should be MOCK_COMPANY_ID
        userId: chat.userId,
        title: chat.title,
        contextSnapshot: chat.contextSnapshot,
        messages: chat.messages, 
        createdAt: AdminTimestamp.fromDate(chat.createdAt),
        lastMessageAt: AdminTimestamp.fromDate(chat.lastMessageAt)
    });
  });

  console.log(`Seeding daily aggregate for company ID: ${MOCK_COMPANY_ID}...`);
  const todayForAggregate = new Date();
  todayForAggregate.setUTCHours(0,0,0,0);
  const aggregateDocId = `${MOCK_COMPANY_ID}_${todayForAggregate.toISOString().split('T')[0]}`; // Uses standardized ID
  const aggregateDocRef = db.collection('daily_aggregates').doc(aggregateDocId);
  batch.set(aggregateDocRef, {
    ...mockDailyAggregate,
    date: AdminTimestamp.fromDate(todayForAggregate),
    lastCalculated: FieldValue.serverTimestamp(),
  });


  try {
    await batch.commit();
    console.log(`[Seed Script] Batch commit successful. (Default) database seeded for company ID: ${MOCK_COMPANY_ID}.`);
  } catch (error: any) {
    console.error(`[Seed Script] Error committing batch to (default) database:`, error);
    throw error;
  }
}

seedDatabase().catch(error => {
  console.error("[Seed Script] Unhandled error during seeding:", error);
  process.exit(1);
});

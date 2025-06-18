// scripts/seedData.ts
// This is a conceptual script for seeding Firestore data.
// To run this, you'd need Node.js, Firebase Admin SDK, and proper credentials.
// Example: npx ts-node scripts/seedData.ts

import * as admin from 'firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore'; // Import Timestamp explicitly
import type {
  CompanyDocument, UserDocument, ProductDocument, InventoryStockDocument,
  SupplierDocument, OrderDocument, SalesHistoryDocument, ForecastDocument,
  DocumentMetadata, ChatSessionDocument, ChatMessage
} from '../src/lib/types/firestore';

// --- Firebase Admin SDK Initialization ---
try {
  // IMPORTANT: Ensure the path to your Firebase service account key is correct.
  // This file should be in the root of your project if using the path below.
  // DO NOT COMMIT YOUR ACTUAL SERVICE ACCOUNT KEY TO PUBLIC REPOSITORIES.
  const serviceAccount = require("../service-account-key.json"); 
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://aria-jknbu-default-rtdb.firebaseio.com" // Your provided DB URL
    });
    console.log("Firebase Admin SDK initialized.");
  }
} catch (error) {
  console.error("Error initializing Firebase Admin SDK. Make sure your service account key is correct and accessible at '../service-account-key.json'.");
  console.error("Error details:", error);
  process.exit(1); // Exit if SDK cannot be initialized
}
const db = admin.firestore();
// ------------------------------------------------------------------


console.log("--- Data Seeding Script for SupplyChainAI ---");

const MOCK_COMPANY_ID = 'comp_supplychainai_seed_001';
const MOCK_USER_ID_OWNER = 'user_owner_seed_001';
const MOCK_USER_ID_MANAGER = 'user_manager_seed_001';
const MOCK_PRODUCT_IDS: Record<string, string> = {}; // To store generated product IDs by SKU

// Mock Data Definitions
const mockCompany: Omit<CompanyDocument, 'id' | 'createdAt'> & { id: string, createdAt: Date } = {
  id: MOCK_COMPANY_ID,
  name: 'Seed Supply Co.',
  plan: 'pro',
  createdAt: new Date(),
  settings: { timezone: 'America/New_York', currency: 'USD' },
  ownerId: MOCK_USER_ID_OWNER,
};

const mockUsers: (Omit<UserDocument, 'uid' | 'createdAt'> & { uid: string, createdAt: Date })[] = [
  {
    uid: MOCK_USER_ID_OWNER,
    email: 'owner@seedsupply.example.com',
    companyId: MOCK_COMPANY_ID,
    role: 'owner',
    displayName: 'Seed Owner',
    createdAt: new Date(),
  },
  {
    uid: MOCK_USER_ID_MANAGER,
    email: 'manager@seedsupply.example.com',
    companyId: MOCK_COMPANY_ID,
    role: 'manager',
    displayName: 'Seed Manager',
    createdAt: new Date(),
  },
];

const mockProductsRaw: (Omit<ProductDocument, 'id' | 'companyId' | 'createdAt' | 'lastUpdated'>)[] = [
  { sku: "LAPTOP001", name: "15in Pro Laptop", description: "High-performance laptop for professionals.", category: "Electronics", basePrice: 1299.99, cost: 850.00, imageUrl: "https://placehold.co/300x300.png?text=Laptop", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "MOUSE002", name: "Wireless Ergonomic Mouse", description: "Comfortable wireless mouse.", category: "Electronics", basePrice: 39.99, cost: 15.50, imageUrl: "https://placehold.co/300x300.png?text=Mouse", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "KEYB003", name: "Mechanical Keyboard", description: "RGB Mechanical Keyboard.", category: "Electronics", basePrice: 89.99, cost: 42.00, imageUrl: "https://placehold.co/300x300.png?text=Keyboard", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "MONITOR01", name: "27in 4K Monitor", description: "Ultra HD 27-inch monitor.", category: "Electronics", basePrice: 349.99, cost: 220.00, imageUrl: "https://placehold.co/300x300.png?text=Monitor", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "TSHIRT001", name: "Organic Cotton T-Shirt", description: "Plain white organic cotton t-shirt.", category: "Apparel", basePrice: 24.99, cost: 8.00, imageUrl: "https://placehold.co/300x300.png?text=TShirt", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "COFFEE001", name: "Premium Coffee Beans 1kg", description: "Whole bean dark roast.", category: "Groceries", basePrice: 19.99, cost: 10.50, imageUrl: "https://placehold.co/300x300.png?text=Coffee", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "BOOK001", name: "Supply Chain Management Basics", description: "Introductory book on SCM.", category: "Books", basePrice: 49.99, cost: 20.00, imageUrl: "https://placehold.co/300x300.png?text=Book", createdBy: MOCK_USER_ID_MANAGER },
  // ... Add up to 100+ items for thorough testing
];

const mockProducts: (Omit<ProductDocument, 'id' | 'createdAt' | 'lastUpdated'> & {id: string, createdAt: Date, lastUpdated: Date})[] = mockProductsRaw.map((p, index) => {
  const id = `prod_seed_${String(index + 1).padStart(3, '0')}`;
  MOCK_PRODUCT_IDS[p.sku] = id; // Store mapping for later use
  return {
    id,
    companyId: MOCK_COMPANY_ID,
    ...p,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random creation within last 30 days
    lastUpdated: new Date(),
  };
});


const mockInventoryStockRaw: (Omit<InventoryStockDocument, 'id' | 'companyId' | 'lastUpdated'>)[] = [
  { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: "LAPTOP001", name: "15in Pro Laptop", quantity: 5, unitCost: 850.00, reorderPoint: 10, reorderQuantity: 5, location: "WH-A1", lowStockAlertSent: true, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Laptop" },
  { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: "MOUSE002", name: "Wireless Ergonomic Mouse", quantity: 50, unitCost: 15.50, reorderPoint: 20, reorderQuantity: 25, location: "WH-A2", lowStockAlertSent: false, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Mouse" },
  { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: "KEYB003", name: "Mechanical Keyboard", quantity: 2, unitCost: 42.00, reorderPoint: 5, reorderQuantity: 5, location: "WH-B1", lowStockAlertSent: true, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Keyboard" },
  { productId: MOCK_PRODUCT_IDS["MONITOR01"], sku: "MONITOR01", name: "27in 4K Monitor", quantity: 0, unitCost: 220.00, reorderPoint: 3, reorderQuantity: 3, location: "WH-C1", lowStockAlertSent: true, category: "Electronics", imageUrl: "https://placehold.co/300x300.png?text=Monitor" },
  { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: "TSHIRT001", name: "Organic Cotton T-Shirt", quantity: 150, unitCost: 8.00, reorderPoint: 50, reorderQuantity: 75, location: "WH-D1", lowStockAlertSent: false, category: "Apparel", imageUrl: "https://placehold.co/300x300.png?text=TShirt" },
  { productId: MOCK_PRODUCT_IDS["COFFEE001"], sku: "COFFEE001", name: "Premium Coffee Beans 1kg", quantity: 75, unitCost: 10.50, reorderPoint: 30, reorderQuantity: 50, location: "WH-E1", lowStockAlertSent: false, category: "Groceries", imageUrl: "https://placehold.co/300x300.png?text=Coffee" },
  { productId: MOCK_PRODUCT_IDS["BOOK001"], sku: "BOOK001", name: "Supply Chain Management Basics", quantity: 20, unitCost: 20.00, reorderPoint: 10, reorderQuantity: 10, location: "WH-F1", lowStockAlertSent: false, category: "Books", imageUrl: "https://placehold.co/300x300.png?text=Book" },
  // ... ensure some items are below reorder point
];

const mockInventoryStock: (Omit<InventoryStockDocument, 'id' | 'lastUpdated'> & {id: string, lastUpdated: Date})[] = mockInventoryStockRaw.map((inv, index) => ({
  id: `inv_stock_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID,
  ...inv,
  lastUpdated: new Date(),
}));


const mockSuppliersRaw: (Omit<SupplierDocument, 'id' | 'companyId' | 'createdAt' | 'lastUpdated'>)[] = [
  {
    name: 'ElectroParts Ltd.',
    email: 'sales@electroparts.example.com',
    phone: '555-0101',
    leadTimeDays: 14,
    reliabilityScore: 92,
    paymentTerms: 'Net 30',
    productsSupplied: [ 
      { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: 'LAPTOP001', name: '15in Pro Laptop', lastPrice: 840.00, moqForItem: 5 },
      { productId: MOCK_PRODUCT_IDS["MONITOR01"], sku: 'MONITOR01', name: '27in 4K Monitor', lastPrice: 210.00, moqForItem: 3 },
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
      { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: 'MOUSE002', name: 'Wireless Ergonomic Mouse', lastPrice: 15.00, moqForItem: 50 },
      { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: 'KEYB003', name: 'Mechanical Keyboard', lastPrice: 40.00, moqForItem: 20 },
      { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: 'TSHIRT001', name: 'Organic Cotton T-Shirt', lastPrice: 7.50, moqForItem: 100 },
    ],
    createdBy: MOCK_USER_ID_MANAGER,
    logoUrl: 'https://placehold.co/60x60.png?text=GG'
  },
];

const mockSuppliers: (Omit<SupplierDocument, 'id' | 'createdAt' | 'lastUpdated'> & {id: string, createdAt: Date, lastUpdated: Date})[] = mockSuppliersRaw.map((s, index) => ({
  id: `sup_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID,
  ...s,
  createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
  lastUpdated: new Date(),
}));


const mockOrdersRaw: (Omit<OrderDocument, 'id' | 'companyId' | 'createdAt' | 'lastUpdated' | 'orderDate'> & {orderDate: Date, expectedDate?: Date, actualDeliveryDate?: Date})[] = [
  { // Purchase Order 1
    orderNumber: 'PO-2024-SEED-001',
    type: 'purchase',
    supplierId: mockSuppliers[0].id,
    items: [
      { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: 'LAPTOP001', name: '15in Pro Laptop', quantity: 10, unitPrice: 845.00, totalCost: 8450.00 },
      { productId: MOCK_PRODUCT_IDS["MONITOR01"], sku: 'MONITOR01', name: '27in 4K Monitor', quantity: 5, unitPrice: 215.00, totalCost: 1075.00 },
    ],
    totalAmount: 9525.00,
    status: 'delivered',
    orderDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    expectedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    actualDeliveryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdBy: MOCK_USER_ID_MANAGER,
  },
  { // Sales Order 1
    orderNumber: 'SO-2024-SEED-001',
    type: 'sales',
    customerId: 'cust_retail_001',
    items: [
      { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: 'MOUSE002', name: 'Wireless Ergonomic Mouse', quantity: 2, unitPrice: 39.99, totalCost: 79.98 },
      { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: 'KEYB003', name: 'Mechanical Keyboard', quantity: 1, unitPrice: 89.99, totalCost: 89.99 },
    ],
    totalAmount: 169.97,
    status: 'completed',
    orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    actualDeliveryDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    createdBy: MOCK_USER_ID_MANAGER,
  },
];

const mockOrders: (Omit<OrderDocument, 'id' | 'createdAt' | 'lastUpdated' | 'orderDate' | 'expectedDate' | 'actualDeliveryDate'> & {id: string, orderDate: Date, expectedDate?: Date, actualDeliveryDate?: Date, createdAt: Date, lastUpdated: Date})[] = mockOrdersRaw.map((o, index) => ({
  id: `ord_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID,
  ...o,
  orderDate: o.orderDate, 
  expectedDate: o.expectedDate,
  actualDeliveryDate: o.actualDeliveryDate,
  createdAt: o.orderDate,
  lastUpdated: o.actualDeliveryDate || o.orderDate,
}));

const mockSalesHistoryRaw: (Omit<SalesHistoryDocument, 'id' | 'companyId' | 'date'> & {orderId?: string, date: Date})[] = [
  { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: "MOUSE002", orderId: mockOrders[1].id, date: mockOrders[1].orderDate, quantity: 2, unitPrice: 39.99, revenue: 79.98, channel: 'Online Store', customerId: 'cust_retail_001' },
  { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: "KEYB003", orderId: mockOrders[1].id, date: mockOrders[1].orderDate, quantity: 1, unitPrice: 89.99, revenue: 89.99, channel: 'Online Store', customerId: 'cust_retail_001' },
  { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: "LAPTOP001", date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), quantity: 1, unitPrice: 1299.99, revenue: 1299.99, channel: 'Direct Sale' },
  { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: "TSHIRT001", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), quantity: 10, unitPrice: 24.99, revenue: 249.90, channel: 'Retail POS' },
  { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: "TSHIRT001", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), quantity: 5, unitPrice: 24.99, revenue: 124.95, channel: 'Online Store' },
];

const mockSalesHistory: (Omit<SalesHistoryDocument, 'id' | 'date'> & {id: string, date: Date})[] = mockSalesHistoryRaw.map((s, index) => ({
  id: `sh_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID,
  ...s,
  date: s.date,
}));

const mockForecastsRaw: (Omit<ForecastDocument, 'id' | 'companyId' | 'generatedAt'>)[] = [
  {
    productId: MOCK_PRODUCT_IDS["LAPTOP001"],
    sku: 'LAPTOP001',
    modelType: 'AI_PATTERN_RECOGNITION',
    predictions: {
      p30: { demand: 8, confidence: 'Medium', confidenceInterval: { lowerBound: 6, upperBound: 10 } },
      p60: { demand: 15, confidence: 'Medium', confidenceInterval: { lowerBound: 12, upperBound: 18 } },
      p90: { demand: 22, confidence: 'Low', confidenceInterval: { lowerBound: 17, upperBound: 27 } },
    },
    accuracy: 85, // Example accuracy
    createdBy: 'system_ai_process',
  },
  {
    productId: MOCK_PRODUCT_IDS["MOUSE002"],
    sku: 'MOUSE002',
    modelType: 'EXPONENTIAL_SMOOTHING',
    predictions: {
      p30: { demand: 40, confidence: 'High', confidenceInterval: { lowerBound: 35, upperBound: 45 } },
      p60: { demand: 85, confidence: 'High', confidenceInterval: { lowerBound: 78, upperBound: 92 } },
      p90: { demand: 120, confidence: 'Medium', confidenceInterval: { lowerBound: 110, upperBound: 130 } },
    },
    accuracy: 92,
    createdBy: 'system_ai_process',
  },
];

const mockForecasts: (Omit<ForecastDocument, 'id' | 'generatedAt'> & {id: string, generatedAt: Date})[] = mockForecastsRaw.map((fc, index) => ({
    id: `fc_seed_${String(index + 1).padStart(3, '0')}`,
    companyId: MOCK_COMPANY_ID,
    ...fc,
    generatedAt: new Date(),
}));

const mockDocumentsRaw: (Omit<DocumentMetadata, 'id' | 'companyId' | 'uploadedAt' | 'processedAt'>)[] = [
  {
    fileName: 'invoice_electroparts_2024_03.pdf',
    fileType: 'application/pdf',
    fileSize: 123456,
    fileUrl: 'gs://your-bucket-name/documents/invoice_electroparts_2024_03.pdf', // Placeholder
    status: 'processed',
    documentTypeHint: 'invoice', 
    extractedData: { documentType: "invoice", invoiceNumber: "INV-EP-789", totalAmount: 9525.00, vendorName: "ElectroParts Ltd." },
    linkedOrderId: mockOrders[0].id, 
    uploadedBy: MOCK_USER_ID_MANAGER,
    extractionConfidence: 0.95,
  },
  {
    fileName: 'po_to_generalgoods_march.png',
    fileType: 'image/png',
    fileSize: 78910,
    fileUrl: 'gs://your-bucket-name/documents/po_to_generalgoods_march.png', // Placeholder
    status: 'pending_review',
    documentTypeHint: 'purchase_order',
    extractedData: { documentType: "purchase_order", poNumber: "PO-GG-102", totalAmount: 550.00, supplierDetails: { name: "General Goods Inc."} },
    uploadedBy: MOCK_USER_ID_MANAGER,
    extractionConfidence: 0.88,
  },
];

const mockDocuments: (Omit<DocumentMetadata, 'id' | 'uploadedAt' | 'processedAt'> & {id: string, uploadedAt: Date, processedAt?: Date})[] = mockDocumentsRaw.map((doc, index) => ({
    id: `doc_seed_${String(index + 1).padStart(3, '0')}`,
    companyId: MOCK_COMPANY_ID,
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
    context: { loadedInventoryDataSummary: "Live Database Snapshot", currentFocusSKU: "LAPTOP001" },
    title: 'Low Stock Inquiry',
  },
];

const mockChatSessions: (Omit<ChatSessionDocument, 'id' | 'createdAt' | 'lastMessageAt'> & {id: string, createdAt: Date, lastMessageAt: Date})[] = mockChatSessionsRaw.map((chat, index) => ({
    id: `chat_seed_${String(index + 1).padStart(3, '0')}`,
    companyId: MOCK_COMPANY_ID,
    ...chat,
    messages: chat.messages.map(msg => ({...msg, timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - (Math.random() * 3600 * 1000))) } as ChatMessage)),
    createdAt: new Date(Date.now() - (index + 2) * 60 * 60 * 1000),
    lastMessageAt: new Date(Date.now() - (index + 1) * 59 * 60 * 1000),
}));


async function seedDatabase() {
  console.log("Connecting to Firestore...");
  const batch = db.batch(); // Use batches for efficiency

  console.log("Seeding data to Firestore collections:");

  console.log(`Seeding company: ${mockCompany.name}`);
  const companyDocRef = db.collection('companies').doc(mockCompany.id);
  batch.set(companyDocRef, { ...mockCompany, createdAt: admin.firestore.Timestamp.fromDate(mockCompany.createdAt) });

  console.log(`Seeding ${mockUsers.length} users...`);
  mockUsers.forEach(user => {
    const userDocRef = db.collection('users').doc(user.uid);
    batch.set(userDocRef, { ...user, createdAt: admin.firestore.Timestamp.fromDate(user.createdAt) });
  });

  console.log(`Seeding ${mockProducts.length} products...`);
  mockProducts.forEach(product => {
    const productDocRef = db.collection('products').doc(product.id);
    batch.set(productDocRef, { ...product, createdAt: admin.firestore.Timestamp.fromDate(product.createdAt), lastUpdated: admin.firestore.Timestamp.fromDate(product.lastUpdated) });
  });
  
  console.log(`Seeding ${mockInventoryStock.length} inventory stock records...`);
  mockInventoryStock.forEach(item => {
    const itemDocRef = db.collection('inventory').doc(item.id);
    batch.set(itemDocRef, { ...item, lastUpdated: admin.firestore.Timestamp.fromDate(item.lastUpdated) });
  });
  
  console.log(`Seeding ${mockSuppliers.length} suppliers...`);
  mockSuppliers.forEach(supplier => {
    const supplierDocRef = db.collection('suppliers').doc(supplier.id);
    batch.set(supplierDocRef, { ...supplier, createdAt: admin.firestore.Timestamp.fromDate(supplier.createdAt), lastUpdated: admin.firestore.Timestamp.fromDate(supplier.lastUpdated) });
  });

  console.log(`Seeding ${mockOrders.length} orders...`);
  mockOrders.forEach(order => {
    const orderDocRef = db.collection('orders').doc(order.id);
    batch.set(orderDocRef, {
         ...order, 
         orderDate: admin.firestore.Timestamp.fromDate(order.orderDate as Date), 
         expectedDate: order.expectedDate ? admin.firestore.Timestamp.fromDate(order.expectedDate as Date) : undefined,
         actualDeliveryDate: order.actualDeliveryDate ? admin.firestore.Timestamp.fromDate(order.actualDeliveryDate as Date) : undefined,
         createdAt: admin.firestore.Timestamp.fromDate(order.createdAt as Date), 
         lastUpdated: admin.firestore.Timestamp.fromDate(order.lastUpdated as Date)
    });
  });

  console.log(`Seeding ${mockSalesHistory.length} sales history records...`);
  mockSalesHistory.forEach(sh => {
    const shDocRef = db.collection('sales_history').doc(sh.id);
    batch.set(shDocRef, { ...sh, date: admin.firestore.Timestamp.fromDate(sh.date) });
  });

  console.log(`Seeding ${mockForecasts.length} forecasts...`);
  mockForecasts.forEach(fc => {
    const fcDocRef = db.collection('forecasts').doc(fc.id);
    batch.set(fcDocRef, { ...fc, generatedAt: admin.firestore.Timestamp.fromDate(fc.generatedAt) });
  });

  console.log(`Seeding ${mockDocuments.length} document metadata entries...`);
  mockDocuments.forEach(doc => {
    const docRef = db.collection('documents').doc(doc.id);
    batch.set(docRef, { 
        ...doc, 
        uploadedAt: admin.firestore.Timestamp.fromDate(doc.uploadedAt), 
        processedAt: doc.processedAt ? admin.firestore.Timestamp.fromDate(doc.processedAt) : undefined 
    });
  });

  console.log(`Seeding ${mockChatSessions.length} chat sessions...`);
  mockChatSessions.forEach(chat => {
    const chatRef = db.collection('chat_sessions').doc(chat.id);
    batch.set(chatRef, { 
        ...chat, 
        createdAt: admin.firestore.Timestamp.fromDate(chat.createdAt), 
        lastMessageAt: admin.firestore.Timestamp.fromDate(chat.lastMessageAt)
        // messages are already Timestamps
    });
  });

  // Commit the batch
  try {
    await batch.commit();
    console.log("Batch commit successful. Database seeded.");
  } catch (error) {
    console.error("Error committing batch: ", error);
  }
  
  console.log("\n--- Mock Data Summary (Written to DB) ---");
  console.log("Company:", JSON.stringify(mockCompany, null, 2));
  console.log("Users (first 1):", JSON.stringify(mockUsers.slice(0,1), null, 2) + "\n  ...");
  console.log("Products (first 2):", JSON.stringify(mockProducts.slice(0,2), null, 2) + "\n  ...");
  console.log("Inventory Stock (first 2):", JSON.stringify(mockInventoryStock.slice(0,2), null, 2) + "\n  ...");

  console.log("\nSeeding complete. Data should be in your Firestore database.");
}

seedDatabase().catch(console.error);
    

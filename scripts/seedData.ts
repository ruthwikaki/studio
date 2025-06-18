// scripts/seedData.ts
// This is a conceptual script for seeding Firestore data.
// To run this, you'd need Node.js, Firebase Admin SDK, and proper credentials.
// Example: ts-node scripts/seedData.ts

// import * as admin from 'firebase-admin';
// import { Timestamp } from 'firebase-admin/firestore';
// import type {
//   CompanyDocument, UserDocument, ProductDocument, InventoryStockDocument,
//   SupplierDocument, OrderDocument, SalesHistoryDocument, ForecastDocument,
//   DocumentMetadata, ChatSessionDocument
// } from '../src/lib/types/firestore';

console.log("--- Conceptual Data Seeding Script for SupplyChainAI ---");
console.log("This script outlines how you might seed Firestore data.");
console.log("It does not connect to or modify any database.\n");

const MOCK_COMPANY_ID = 'comp_supplychainai_seed_001';
const MOCK_USER_ID_OWNER = 'user_owner_seed_001';
const MOCK_USER_ID_MANAGER = 'user_manager_seed_001';
const MOCK_PRODUCT_IDS: Record<string, string> = {};

// Mock Data Definitions
const mockCompany: any /* CompanyDocument */ = {
  id: MOCK_COMPANY_ID,
  name: 'Seed Supply Co.',
  plan: 'pro',
  createdAt: new Date(), // In real script: Timestamp.now(),
  settings: { timezone: 'America/New_York', currency: 'USD' },
  ownerId: MOCK_USER_ID_OWNER,
};

const mockUsers: any[] /* UserDocument[] */ = [
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

const mockProducts: any[] /* ProductDocument[] */ = [
  { sku: "LAPTOP001", name: "15in Pro Laptop", description: "High-performance laptop for professionals.", category: "Electronics", basePrice: 1299.99, cost: 850.00, imageUrl: "https://placehold.co/300x300.png?text=Laptop", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "MOUSE002", name: "Wireless Ergonomic Mouse", description: "Comfortable wireless mouse.", category: "Electronics", basePrice: 39.99, cost: 15.50, imageUrl: "https://placehold.co/300x300.png?text=Mouse", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "KEYB003", name: "Mechanical Keyboard", description: "RGB Mechanical Keyboard.", category: "Electronics", basePrice: 89.99, cost: 42.00, imageUrl: "https://placehold.co/300x300.png?text=Keyboard", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "MONITOR01", name: "27in 4K Monitor", description: "Ultra HD 27-inch monitor.", category: "Electronics", basePrice: 349.99, cost: 220.00, imageUrl: "https://placehold.co/300x300.png?text=Monitor", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "TSHIRT001", name: "Organic Cotton T-Shirt", description: "Plain white organic cotton t-shirt.", category: "Apparel", basePrice: 24.99, cost: 8.00, imageUrl: "https://placehold.co/300x300.png?text=TShirt", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "COFFEE001", name: "Premium Coffee Beans 1kg", description: "Whole bean dark roast.", category: "Groceries", basePrice: 19.99, cost: 10.50, imageUrl: "https://placehold.co/300x300.png?text=Coffee", createdBy: MOCK_USER_ID_MANAGER },
  { sku: "BOOK001", name: "Supply Chain Management Basics", description: "Introductory book on SCM.", category: "Books", basePrice: 49.99, cost: 20.00, imageUrl: "https://placehold.co/300x300.png?text=Book", createdBy: MOCK_USER_ID_MANAGER },
].map((p, index) => {
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


const mockInventoryStock: any[] /* InventoryStockDocument[] */ = [
  { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: "LAPTOP001", quantity: 5, reorderPoint: 10, reorderQuantity: 5, location: "WH-A1", lowStockAlertSent: true },
  { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: "MOUSE002", quantity: 50, reorderPoint: 20, reorderQuantity: 25, location: "WH-A2", lowStockAlertSent: false },
  { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: "KEYB003", quantity: 2, reorderPoint: 5, reorderQuantity: 5, location: "WH-B1", lowStockAlertSent: true },
  { productId: MOCK_PRODUCT_IDS["MONITOR01"], sku: "MONITOR01", quantity: 0, reorderPoint: 3, reorderQuantity: 3, location: "WH-C1", lowStockAlertSent: true },
  { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: "TSHIRT001", quantity: 150, reorderPoint: 50, reorderQuantity: 75, location: "WH-D1", lowStockAlertSent: false },
  { productId: MOCK_PRODUCT_IDS["COFFEE001"], sku: "COFFEE001", quantity: 75, reorderPoint: 30, reorderQuantity: 50, location: "WH-E1", lowStockAlertSent: false },
  { productId: MOCK_PRODUCT_IDS["BOOK001"], sku: "BOOK001", quantity: 20, reorderPoint: 10, reorderQuantity: 10, location: "WH-F1", lowStockAlertSent: false },
].map((inv, index) => ({
  id: `inv_stock_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID,
  ...inv,
  lastUpdated: new Date(),
}));


const mockSuppliers: any[] /* SupplierDocument[] */ = [
  {
    id: 'sup_seed_elec_001',
    companyId: MOCK_COMPANY_ID,
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
  },
  {
    id: 'sup_seed_gen_002',
    companyId: MOCK_COMPANY_ID,
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
  },
].map(s => ({
  ...s,
  createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
  lastUpdated: new Date(),
}));


const mockOrders: any[] /* OrderDocument[] */ = [
  { // Purchase Order 1
    id: 'ord_seed_po_001',
    companyId: MOCK_COMPANY_ID,
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
    id: 'ord_seed_so_001',
    companyId: MOCK_COMPANY_ID,
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
].map(o => ({
  ...o,
  createdAt: o.orderDate,
  lastUpdated: o.actualDeliveryDate || o.orderDate,
}));

const mockSalesHistory: any[] /* SalesHistoryDocument[] */ = [
  { productId: MOCK_PRODUCT_IDS["MOUSE002"], sku: "MOUSE002", orderId: mockOrders[1].id, date: mockOrders[1].orderDate, quantity: 2, unitPrice: 39.99, revenue: 79.98, channel: 'Online Store', customerId: 'cust_retail_001' },
  { productId: MOCK_PRODUCT_IDS["KEYB003"], sku: "KEYB003", orderId: mockOrders[1].id, date: mockOrders[1].orderDate, quantity: 1, unitPrice: 89.99, revenue: 89.99, channel: 'Online Store', customerId: 'cust_retail_001' },
  { productId: MOCK_PRODUCT_IDS["LAPTOP001"], sku: "LAPTOP001", date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), quantity: 1, unitPrice: 1299.99, revenue: 1299.99, channel: 'Direct Sale' },
  { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: "TSHIRT001", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), quantity: 10, unitPrice: 24.99, revenue: 249.90, channel: 'Retail POS' },
  { productId: MOCK_PRODUCT_IDS["TSHIRT001"], sku: "TSHIRT001", date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), quantity: 5, unitPrice: 24.99, revenue: 124.95, channel: 'Online Store' },
].map((s, index) => ({
  id: `sh_seed_${String(index + 1).padStart(3, '0')}`,
  companyId: MOCK_COMPANY_ID,
  ...s,
}));

const mockForecasts: any[] /* ForecastDocument[] */ = [
  {
    id: 'fc_seed_laptop_001',
    companyId: MOCK_COMPANY_ID,
    productId: MOCK_PRODUCT_IDS["LAPTOP001"],
    sku: 'LAPTOP001',
    modelType: 'AI_PATTERN_RECOGNITION',
    generatedAt: new Date(),
    predictions: {
      p30: { demand: 8, confidence: 'Medium', confidenceInterval: { lowerBound: 6, upperBound: 10 } },
      p60: { demand: 15, confidence: 'Medium', confidenceInterval: { lowerBound: 12, upperBound: 18 } },
      p90: { demand: 22, confidence: 'Low', confidenceInterval: { lowerBound: 17, upperBound: 27 } },
    },
    accuracy: 85, // Example accuracy
    createdBy: 'system_ai_process',
  },
  {
    id: 'fc_seed_mouse_001',
    companyId: MOCK_COMPANY_ID,
    productId: MOCK_PRODUCT_IDS["MOUSE002"],
    sku: 'MOUSE002',
    modelType: 'EXPONENTIAL_SMOOTHING',
    generatedAt: new Date(),
    predictions: {
      p30: { demand: 40, confidence: 'High', confidenceInterval: { lowerBound: 35, upperBound: 45 } },
      p60: { demand: 85, confidence: 'High', confidenceInterval: { lowerBound: 78, upperBound: 92 } },
      p90: { demand: 120, confidence: 'Medium', confidenceInterval: { lowerBound: 110, upperBound: 130 } },
    },
    accuracy: 92,
    createdBy: 'system_ai_process',
  },
];

const mockDocuments: any[] /* DocumentMetadata[] */ = [
  {
    id: 'doc_seed_inv_001',
    companyId: MOCK_COMPANY_ID,
    fileName: 'invoice_electroparts_2024_03.pdf',
    fileType: 'application/pdf',
    fileSize: 123456,
    fileUrl: 'gs://your-bucket-name/documents/invoice_electroparts_2024_03.pdf', // Placeholder
    status: 'processed',
    documentTypeHint: 'invoice',
    extractedData: { documentType: "invoice", invoiceNumber: "INV-EP-789", totalAmount: 9525.00, vendorName: "ElectroParts Ltd." },
    linkedOrderId: mockOrders[0].id, // Link to the PO
    uploadedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
    processedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    uploadedBy: MOCK_USER_ID_MANAGER,
    extractionConfidence: 0.95,
  },
  {
    id: 'doc_seed_po_001',
    companyId: MOCK_COMPANY_ID,
    fileName: 'po_to_generalgoods_march.png',
    fileType: 'image/png',
    fileSize: 78910,
    fileUrl: 'gs://your-bucket-name/documents/po_to_generalgoods_march.png', // Placeholder
    status: 'pending_review',
    documentTypeHint: 'purchase_order',
    extractedData: { documentType: "purchase_order", poNumber: "PO-GG-102", totalAmount: 550.00, supplierDetails: { name: "General Goods Inc."} },
    uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    processedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    uploadedBy: MOCK_USER_ID_MANAGER,
    extractionConfidence: 0.88,
  },
];

const mockChatSessions: any[] /* ChatSessionDocument[] */ = [
  {
    id: 'chat_seed_001',
    companyId: MOCK_COMPANY_ID,
    userId: MOCK_USER_ID_OWNER,
    messages: [
      { role: 'user', content: 'Which items are running low?', timestamp: new Date(Date.now() - 60 * 60 * 1000) },
      { role: 'assistant', content: 'Currently, LAPTOP001 (5 units), KEYB003 (2 units), and MONITOR01 (0 units) are below their reorder points.', timestamp: new Date(Date.now() - 59 * 60 * 1000) },
    ],
    context: { loadedInventoryDataSummary: "Live Database Snapshot", currentFocusSKU: "LAPTOP001" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    lastMessageAt: new Date(Date.now() - 59 * 60 * 1000),
    title: 'Low Stock Inquiry',
  },
];


async function seedDatabase() {
  // console.log("Connecting to Firestore...");
  // This is where you'd use the admin SDK:
  // const db = admin.firestore();
  // const batch = db.batch();

  // --- Seeding Logic (Conceptual) ---
  // console.log(`Seeding company: ${mockCompany.name}`);
  // const companyDocRef = db.collection('companies').doc(mockCompany.id);
  // batch.set(companyDocRef, mockCompany);

  // console.log(`Seeding ${mockUsers.length} users...`);
  // mockUsers.forEach(user => {
  //   const userDocRef = db.collection('users').doc(user.uid);
  //   batch.set(userDocRef, user);
  // });

  // console.log(`Seeding ${mockProducts.length} products...`);
  // mockProducts.forEach(product => {
  //   const productDocRef = db.collection('products').doc(product.id);
  //   batch.set(productDocRef, product);
  // });
  
  // console.log(`Seeding ${mockInventoryStock.length} inventory stock records...`);
  // mockInventoryStock.forEach(item => {
  //   const itemDocRef = db.collection('inventory').doc(item.id);
  //   batch.set(itemDocRef, item);
  // });
  
  // console.log(`Seeding ${mockSuppliers.length} suppliers...`);
  // mockSuppliers.forEach(supplier => {
  //   const supplierDocRef = db.collection('suppliers').doc(supplier.id);
  //   batch.set(supplierDocRef, supplier);
  // });

  // console.log(`Seeding ${mockOrders.length} orders...`);
  // mockOrders.forEach(order => {
  //   const orderDocRef = db.collection('orders').doc(order.id);
  //   batch.set(orderDocRef, order);
  // });

  // console.log(`Seeding ${mockSalesHistory.length} sales history records...`);
  // mockSalesHistory.forEach(sh => {
  //   const shDocRef = db.collection('sales_history').doc(sh.id);
  //   batch.set(shDocRef, sh);
  // });

  // console.log(`Seeding ${mockForecasts.length} forecasts...`);
  // mockForecasts.forEach(fc => {
  //   const fcDocRef = db.collection('forecasts').doc(fc.id);
  //   batch.set(fcDocRef, fc);
  // });

  // console.log(`Seeding ${mockDocuments.length} document metadata entries...`);
  // mockDocuments.forEach(doc => {
  //   const docRef = db.collection('documents').doc(doc.id);
  //   batch.set(docRef, doc);
  // });

  // console.log(`Seeding ${mockChatSessions.length} chat sessions...`);
  // mockChatSessions.forEach(chat => {
  //   const chatRef = db.collection('chat_sessions').doc(chat.id);
  //   batch.set(chatRef, chat);
  // });

  // // Commit the batch
  // try {
  //   await batch.commit();
  //   console.log("Batch committed successfully. Database seeded conceptually.");
  // } catch (error) {
  //   console.error("Error committing batch: ", error);
  // }
  
  console.log("\n--- Mock Data Summary (Conceptual) ---");
  console.log("Company:", JSON.stringify(mockCompany, null, 2));
  console.log("Users (first 1):", JSON.stringify(mockUsers.slice(0,1), null, 2) + "\n  ...");
  console.log("Products (first 2):", JSON.stringify(mockProducts.slice(0,2), null, 2) + "\n  ...");
  console.log("Inventory Stock (first 2):", JSON.stringify(mockInventoryStock.slice(0,2), null, 2) + "\n  ...");
  console.log("Suppliers (first 1):", JSON.stringify(mockSuppliers.slice(0,1), null, 2) + "\n  ...");
  console.log("Orders (first 1):", JSON.stringify(mockOrders.slice(0,1), null, 2) + "\n  ...");
  console.log("Sales History (first 2):", JSON.stringify(mockSalesHistory.slice(0,2), null, 2) + "\n  ...");
  console.log("Forecasts (first 1):", JSON.stringify(mockForecasts.slice(0,1), null, 2) + "\n  ...");
  console.log("Documents (first 1):", JSON.stringify(mockDocuments.slice(0,1), null, 2) + "\n  ...");
  console.log("Chat Sessions (first 1):", JSON.stringify(mockChatSessions.slice(0,1), null, 2) + "\n  ...");

  console.log("\nSeeding simulation complete. In a real script, this data would be written to Firestore.");
}

// To actually run, you would call seedDatabase() here.
// seedDatabase();

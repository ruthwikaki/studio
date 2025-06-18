
// scripts/seedData.ts
// This is a conceptual script. You'd run this in a Node.js environment
// with Firebase Admin SDK initialized.
// Example: ts-node scripts/seedData.ts

// import * as admin from 'firebase-admin';
// import { Timestamp } from 'firebase-admin/firestore';
// import type { CompanyDocument, UserDocument, InventoryItemDocument, OrderDocument, SupplierDocument, DocumentMetadata } from '../src/lib/types/firestore';

// // Initialize Firebase Admin (replace with your actual service account key)
// // const serviceAccount = require('./path/to/your/serviceAccountKey.json');
// // admin.initializeApp({
// //   credential: admin.credential.cert(serviceAccount)
// // });
// // const db = admin.firestore();

console.log("--- Conceptual Data Seeding Script ---");
console.log("This script outlines how you might seed Firestore data.");
console.log("It does not connect to or modify any database.\n");

const MOCK_COMPANY_ID = 'seed_company_001';
const MOCK_USER_ID_OWNER = 'seed_user_owner_001';
const MOCK_USER_ID_MANAGER = 'seed_user_manager_001';

// Mock Data Definitions
const mockCompany: any /* CompanyDocument */ = {
  id: MOCK_COMPANY_ID,
  name: 'Seed Corp Inc.',
  plan: 'pro',
  createdAt: new Date(), // In real script: Timestamp.now(),
  ownerId: MOCK_USER_ID_OWNER,
  settings: { timezone: 'America/New_York', currency: 'USD' },
};

const mockUsers: any[] /* UserDocument[] */ = [
  {
    uid: MOCK_USER_ID_OWNER,
    email: 'owner@seedcorp.example.com',
    companyId: MOCK_COMPANY_ID,
    role: 'owner',
    displayName: 'Seed Owner',
    createdAt: new Date(),
  },
  {
    uid: MOCK_USER_ID_MANAGER,
    email: 'manager@seedcorp.example.com',
    companyId: MOCK_COMPANY_ID,
    role: 'manager',
    displayName: 'Seed Manager',
    createdAt: new Date(),
  },
];

const mockInventoryItems: any[] /* InventoryItemDocument[] */ = [];
for (let i = 1; i <= 120; i++) {
  mockInventoryItems.push({
    id: `SKU_SEED_${String(i).padStart(3, '0')}`,
    companyId: MOCK_COMPANY_ID,
    sku: `SKU_SEED_${String(i).padStart(3, '0')}`,
    name: `Product Seed ${i}`,
    quantity: Math.floor(Math.random() * 200) + 10,
    unitCost: parseFloat((Math.random() * 50 + 5).toFixed(2)),
    reorderPoint: Math.floor(Math.random() * 50) + 5,
    category: ['Electronics', 'Apparel', 'Home Goods', 'Office'][i % 4],
    lastUpdated: new Date(),
    createdBy: MOCK_USER_ID_MANAGER,
  });
}

const mockSuppliers: any[] /* SupplierDocument[] */ = [
  {
    id: 'SUP_SEED_001',
    companyId: MOCK_COMPANY_ID,
    name: 'Seed Supplier Alpha',
    email: 'alpha@seedsuppliers.example.com',
    leadTimeDays: 14,
    reliabilityScore: 92,
    productsSupplied: [
      { productId: 'SKU_SEED_001', sku: 'SKU_SEED_001', name: 'Product Seed 1', lastPrice: mockInventoryItems[0].unitCost * 0.8 },
      { productId: 'SKU_SEED_002', sku: 'SKU_SEED_002', name: 'Product Seed 2', lastPrice: mockInventoryItems[1].unitCost * 0.85 },
    ],
    createdAt: new Date(),
    lastUpdated: new Date(),
  },
  {
    id: 'SUP_SEED_002',
    companyId: MOCK_COMPANY_ID,
    name: 'Seed Supplier Beta',
    email: 'beta@seedsuppliers.example.com',
    leadTimeDays: 7,
    reliabilityScore: 85,
    productsSupplied: [
      { productId: 'SKU_SEED_003', sku: 'SKU_SEED_003', name: 'Product Seed 3', lastPrice: mockInventoryItems[2].unitCost * 0.9 },
    ],
    createdAt: new Date(),
    lastUpdated: new Date(),
  }
];

// Function to simulate historical sales data (would be part of orders or a separate sales log)
const generateHistoricalSales = (itemId: string, days: number) => {
  const sales = [];
  for (let i = 0; i < days; i++) {
    if (Math.random() > 0.5) { // Simulate sales on some days
      sales.push({
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
        quantitySold: Math.floor(Math.random() * 5) + 1,
      });
    }
  }
  return sales;
};
console.log("\nSample Historical Sales for SKU_SEED_001 (conceptual):");
console.log(generateHistoricalSales('SKU_SEED_001', 90).slice(0,3));


const mockDocuments: any[] /* DocumentMetadata[] */ = [
    {
        id: 'DOC_SEED_INV_001',
        companyId: MOCK_COMPANY_ID,
        fileName: 'sample_invoice.pdf',
        fileType: 'application/pdf',
        fileSize: 120 * 1024, // 120KB
        fileUrl: 'gs://your-bucket-name/documents/sample_invoice.pdf', // Placeholder
        status: 'processed',
        documentTypeHint: 'invoice',
        extractedData: { documentType: "invoice", invoiceNumber: "INV_SEED_001", totalAmount: 150.75 },
        uploadedAt: new Date(),
        processedAt: new Date(),
        uploadedBy: MOCK_USER_ID_MANAGER,
    },
    {
        id: 'DOC_SEED_PO_001',
        companyId: MOCK_COMPANY_ID,
        fileName: 'purchase_order_sample.png',
        fileType: 'image/png',
        fileSize: 85 * 1024, // 85KB
        fileUrl: 'gs://your-bucket-name/documents/purchase_order_sample.png', // Placeholder
        status: 'ocr_complete',
        documentTypeHint: 'purchase_order',
        uploadedAt: new Date(),
        uploadedBy: MOCK_USER_ID_MANAGER,
    }
];

async function seedDatabase() {
  // console.log("Connecting to Firestore...");
  // This is where you'd use the admin SDK:
  // const batch = db.batch();

  // console.log(`Seeding company: ${mockCompany.name}`);
  // const companyDocRef = db.collection('companies').doc(mockCompany.id);
  // batch.set(companyDocRef, mockCompany);

  // console.log(`Seeding ${mockUsers.length} users...`);
  // mockUsers.forEach(user => {
  //   const userDocRef = db.collection('users').doc(user.uid);
  //   batch.set(userDocRef, user);
  // });

  // console.log(`Seeding ${mockInventoryItems.length} inventory items...`);
  // mockInventoryItems.forEach(item => {
  //   const itemDocRef = db.collection('inventory').doc(item.id);
  //   batch.set(itemDocRef, item);
  // });
  
  // console.log(`Seeding ${mockSuppliers.length} suppliers...`);
  // mockSuppliers.forEach(supplier => {
  //   const supplierDocRef = db.collection('suppliers').doc(supplier.id);
  //   batch.set(supplierDocRef, supplier);
  // });

  // console.log(`Seeding ${mockDocuments.length} documents...`);
  // mockDocuments.forEach(doc => {
  //   const docRef = db.collection('documents').doc(doc.id);
  //   batch.set(docRef, doc);
  // });

  // // Commit the batch
  // try {
  //   await batch.commit();
  //   console.log("Batch committed successfully. Database seeded.");
  // } catch (error) {
  //   console.error("Error committing batch: ", error);
  // }
  
  console.log("\n--- Mock Data Summary ---");
  console.log("Company:", JSON.stringify(mockCompany, null, 2));
  console.log("Users:", JSON.stringify(mockUsers.slice(0,1), null, 2) + "\n  ...");
  console.log("Inventory Items (first 2):", JSON.stringify(mockInventoryItems.slice(0,2), null, 2) + "\n  ...");
  console.log("Suppliers (first 1):", JSON.stringify(mockSuppliers.slice(0,1), null, 2) + "\n  ...");
  console.log("Documents (first 1):", JSON.stringify(mockDocuments.slice(0,1), null, 2) + "\n  ...");
  console.log("\nSeeding simulation complete. In a real script, this data would be written to Firestore.");
}
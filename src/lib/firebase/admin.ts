// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Construct an absolute path to 'service-account-key.json' in the project root
// process.cwd() usually points to the project root in a Next.js environment
const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');

try {
  if (!admin.apps.length) {
    console.log(`[Admin SDK] Attempting to load service account key from: ${serviceAccountPath}`);
    if (!fs.existsSync(serviceAccountPath)) {
      // This error will be caught by the outer catch block and logged.
      throw new Error(`Service account key file not found at resolved path: ${serviceAccountPath}. Ensure 'service-account-key.json' is in the project root.`);
    }
    const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFileContent);

    if (!serviceAccount.project_id) {
        throw new Error("Service account key file is missing 'project_id'. Ensure it's the correct key from Firebase.");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id, // Explicitly set projectId
    });
    console.log(`Firebase Admin SDK initialized in admin.ts for project: ${serviceAccount.project_id}, using key from project root.`);
  } else {
    const currentApp = admin.app();
    if (currentApp && currentApp.options && currentApp.options.projectId) {
        console.log(`Firebase Admin SDK already initialized for project: ${currentApp.options.projectId}`);
    } else {
        console.warn("Firebase Admin SDK was already initialized, but project ID could not be determined from the existing app instance. This might indicate an issue.");
    }
  }
} catch (error: any) {
  console.error("--------------------------------------------------------------------");
  console.error("CRITICAL ERROR INITIALIZING FIREBASE ADMIN SDK in admin.ts:");
  if (error.message && error.message.includes("Service account key file not found at resolved path")) {
    console.error(`  Reason: ${error.message}`);
  } else if (error.code === 'ENOENT' || (error.message && error.message.toLowerCase().includes("no such file or directory"))) {
    console.error(`  Reason: The 'service-account-key.json' file was not found.`);
    console.error(`  Expected at: ${serviceAccountPath}`);
  } else if (error.message && (error.message.includes("Failed to parse service account KeyFile") || error.message.includes("Credential implementation provided to initializeApp()"))) {
     console.error("  Reason: The 'service-account-key.json' file seems to be invalid or incomplete (e.g., missing 'project_id', not valid JSON).");
  } else if (error.message && error.message.includes("Service account key file is missing 'project_id'")) {
      console.error("  Reason: The 'service-account-key.json' is missing the 'project_id' field.");
  } else {
    console.error("  Reason:", error.message);
    if (error.stack) console.error("  Stack:", error.stack);
  }
  console.error("  ACTION: Please ensure your 'service-account-key.json' (downloaded from your Firebase project settings) is valid and placed in the project root directory.");
  console.error("--------------------------------------------------------------------");
  // It's important that the application can still run even if admin SDK fails,
  // so other parts (like client-side Firebase) might work.
  // API routes relying on admin SDK will fail, which is expected.
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
export const storageAdmin = admin.storage();
export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin }; // Export the admin namespace itself

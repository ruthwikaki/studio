// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

// Path relative to this file (src/lib/firebase/admin.ts) to reach the project root
const serviceAccountPath = '../../../service-account-key.json'; 

try {
  if (!admin.apps.length) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log("Firebase Admin SDK initialized in admin.ts, using key from project root.");
  }
} catch (error: any) {
  console.error("CRITICAL ERROR initializing Firebase Admin SDK in admin.ts:");
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(serviceAccountPath.replace('../../../', ''))) { // Check for the actual filename part
    console.error(`  Reason: The 'service-account-key.json' file was not found in the project root.`);
    console.error(`  Expected at: project_root/service-account-key.json (resolved from ${serviceAccountPath} relative to admin.ts)`);
    console.error("  ACTION: Please download your service account key from your Firebase project settings, name it 'service-account-key.json', and place it in the project root directory.");
  } else if (error.message.includes("Failed to parse service account KeyFile") || (error.message.includes("Credential implementation provided to initializeApp()") && error.message.includes("failed to fetch a Project ID"))) {
     console.error("  Reason: The 'service-account-key.json' file seems to be invalid or incomplete (e.g., missing 'project_id', not valid JSON).");
     console.error("  ACTION: Please re-download your service account key from Firebase and ensure it's correctly placed in the project root and not corrupted.");
  } else {
    console.error("  Reason:", error.message);
    console.error("  ACTION: Verify your 'service-account-key.json' is correct and in the project root.");
  }
  console.error("--------------------------------------------------------------------");
  // Optionally re-throw or exit if initialization is critical for server startup
  // throw error; 
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
export const storageAdmin = admin.storage();
export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin }; // Export the admin namespace itself

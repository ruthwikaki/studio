// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

// Ensure this path is correct and your service-account-key.json is in the root
// and has been populated with your actual Firebase service account credentials.
const serviceAccountPath = '../../service-account-key.json'; // Path relative to this file

try {
  if (!admin.apps.length) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com` // Or your specific database URL
    });
    console.log("Firebase Admin SDK initialized in admin.ts.");
  }
} catch (error: any) {
  console.error("Error initializing Firebase Admin SDK in admin.ts:", error.message);
  // Prevent further execution if admin SDK fails to initialize critical for backend operations
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(serviceAccountPath)) {
    console.error(`CRITICAL: Service account key not found at expected path: ${serviceAccountPath}. Ensure the file exists and the path is correct.`);
  } else if (error.message.includes("Error: Credential implementation provided to initializeApp() via the \"credential\" property failed to fetch a Project ID.")) {
     console.error("CRITICAL: Service account key JSON is likely malformed or incomplete. Please re-download it from Firebase console and update service-account-key.json.");
  }
  // In a real app, you might want to throw this error to stop the server
  // or handle it more gracefully depending on the context.
  // For now, we log and let Firestore calls fail if db is not initialized.
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
export const storageAdmin = admin.storage();
export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp; // Changed from 'export type' to 'export const'
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore'; // Export type separately if needed elsewhere with a different name

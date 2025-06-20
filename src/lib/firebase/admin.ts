// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Construct an absolute path to 'service-account-key.json' in the project root
const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');
let adminApp: admin.app.App;

try {
  if (!admin.apps.length) {
    console.log(`[Admin SDK] Attempting to load service account key from: ${serviceAccountPath}`);
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account key file not found at resolved path: ${serviceAccountPath}. Ensure 'service-account-key.json' is in the project root.`);
    }
    const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFileContent);

    if (!serviceAccount.project_id) {
        throw new Error("Service account key file is missing 'project_id'. Ensure it's the correct key from Firebase.");
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id, // Ensure projectId is explicitly set
      // No databaseURL needed if using (default) Firestore and not Realtime Database primarily here.
    });
    console.log(`Firebase Admin SDK initialized in admin.ts for project: ${serviceAccount.project_id}. Targeting (default) Firestore database.`);
  } else {
    adminApp = admin.app(); // Use the existing app
    const currentAppProjectId = adminApp.options.projectId;
    if (currentAppProjectId) {
        console.log(`Firebase Admin SDK already initialized for project: ${currentAppProjectId}. Targeting (default) Firestore database.`);
    } else {
        console.warn("Firebase Admin SDK was already initialized, but project ID could not be determined. Targeting (default) Firestore database.");
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
  // process.exit(1); // Consider re-throwing or exiting if critical for server startup
}

// Get Firestore instance for the (default) database.
// This connects to the (default) database instance by default.
export const db = adminApp!.firestore(); // Use adminApp to ensure it's from the initialized app.
console.log(`[Admin SDK] Firestore instance configured for (default) database.`);


export const authAdmin = adminApp!.auth();
export const storageAdmin = adminApp!.storage();
export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin }; // Export the admin namespace itself

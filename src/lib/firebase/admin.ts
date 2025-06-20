// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminInstance: admin.app.App | null = null;

function initializeAdminAppSingleton(): admin.app.App | null {
  if (adminInstance) {
    return adminInstance;
  }

  if (admin.apps.length > 0) {
    console.log(`[Admin SDK] Using existing Firebase Admin app instance.`);
    adminInstance = admin.app();
    return adminInstance;
  }

  // Construct an absolute path to 'service-account-key.json' from the project root
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account-key.json');
  console.log(`[Admin SDK] Attempting to initialize Firebase Admin. Service account path: ${serviceAccountPath}`);

  if (!fs.existsSync(serviceAccountPath)) {
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: Service account key file not found at resolved path: ${serviceAccountPath}.`);
    console.error("[Admin SDK] Ensure 'service-account-key.json' (downloaded from your Firebase project settings) is in the project root directory.");
    console.error("[Admin SDK] Firebase Admin services (db, authAdmin, storageAdmin) will NOT be available.");
    console.error("--------------------------------------------------------------------");
    return null;
  }

  try {
    const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFileContent);

    if (!serviceAccount.project_id) {
      console.error("--------------------------------------------------------------------");
      console.error("[Admin SDK] CRITICAL ERROR: Service account key file is missing 'project_id'. Ensure it's the correct key from Firebase.");
      console.error("[Admin SDK] Firebase Admin services (db, authAdmin, storageAdmin) will NOT be available.");
      console.error("--------------------------------------------------------------------");
      return null;
    }

    adminInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}.`);
    return adminInstance;

  } catch (error: any) {
    console.error("--------------------------------------------------------------------");
    console.error("[Admin SDK] CRITICAL ERROR INITIALIZING FIREBASE ADMIN SDK:");
    if (error.code === 'ENOENT' || (error.message && error.message.toLowerCase().includes("no such file or directory"))) {
      console.error(`  Reason: The 'service-account-key.json' file was not found or was unreadable.`);
      console.error(`  Checked path: ${serviceAccountPath}`);
    } else if (error.message && (error.message.includes("Failed to parse service account KeyFile") || error.message.includes("Credential implementation provided to initializeApp()"))) {
       console.error("  Reason: The 'service-account-key.json' file seems to be invalid or incomplete (e.g., not valid JSON).");
    } else {
      console.error("  Reason:", error.message);
      if (error.stack) console.error("  Stack (partial):", error.stack.substring(0, 500));
    }
    console.error("  ACTION: Please ensure 'service-account-key.json' is valid and placed in the project root directory.");
    console.error("[Admin SDK] Firebase Admin services (db, authAdmin, storageAdmin) will NOT be available.");
    console.error("--------------------------------------------------------------------");
    return null;
  }
}

// Initialize on module load
adminInstance = initializeAdminAppSingleton();

// Conditionally export services. If adminInstance is null, these will be null.
// Code using these exports MUST check if they are null/undefined before use.
export const db = adminInstance ? adminInstance.firestore() : null;
export const authAdmin = adminInstance ? adminInstance.auth() : null;
export const storageAdmin = adminInstance ? adminInstance.storage() : null;

// Static exports from admin.firestore are safe regardless of initialization success
export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';

// Export the admin namespace itself, useful for types or other static utilities
export { admin };

/**
 * Checks if the Firebase Admin SDK has been successfully initialized.
 * @returns {boolean} True if initialized, false otherwise.
 */
export function isAdminInitialized(): boolean {
  return adminInstance !== null && db !== null && authAdmin !== null;
}

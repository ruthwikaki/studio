// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import *   as path from 'path';

let adminInstance: admin.app.App | null = null;
let initializationError: Error | null = null;

function initializeAdminAppSingleton(): admin.app.App | null {
  // If already initialized successfully, return the instance.
  if (adminInstance) {
    return adminInstance;
  }

  // If initialization previously failed, log the stored error and return null.
  // This prevents repeated initialization attempts if the root cause (e.g., bad key file) isn't fixed.
  if (initializationError) {
    console.error("[Admin SDK] Initialization previously failed and will not be re-attempted in this instance. Error:", initializationError.message);
    return null;
  }
  
  // console.log("[Admin SDK] Attempting to initialize Firebase Admin SDK...");

  // Check if a Firebase app (any app, not necessarily [DEFAULT]) is already initialized.
  // This can happen in some environments or if code initializes it elsewhere.
  if (admin.apps.length > 0) {
    const defaultApp = admin.apps.find(app => app?.name === '[DEFAULT]');
    if (defaultApp) {
      // console.log(`[Admin SDK] Using existing [DEFAULT] Firebase Admin app instance.`);
      adminInstance = defaultApp;
      return adminInstance;
    }
    // If other named apps exist, it's a bit complex. For this app's purpose,
    // we usually want to manage our own [DEFAULT] or a specific named instance.
    // For now, if [DEFAULT] isn't found, we'll proceed to initialize our own.
    // console.warn(`[Admin SDK] Other Firebase apps initialized, but [DEFAULT] not found. Proceeding to initialize.`);
  }

  const serviceAccountPath = path.resolve(process.cwd(), 'service-account-key.json');
  if (!fs.existsSync(serviceAccountPath)) {
    initializationError = new Error(`Service account key file not found at resolved path: ${serviceAccountPath}. Ensure 'service-account-key.json' is in the project root directory.`);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    console.error("--------------------------------------------------------------------");
    return null;
  }

  try {
    const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFileContent);

    if (!serviceAccount.project_id) {
      initializationError = new Error("Service account key file is missing 'project_id'. Ensure it's the correct key from Firebase.");
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("--------------------------------------------------------------------");
      return null;
    }

    adminInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}.`);
    initializationError = null; // Clear any potential previous error if re-attempt was successful
    return adminInstance;

  } catch (error: any) {
    initializationError = error;
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
    console.error("--------------------------------------------------------------------");
    return null;
  }
}

// Attempt initialization when the module is first loaded.
initializeAdminAppSingleton();

export function getDb(): admin.firestore.Firestore | null {
  if (!adminInstance && !initializationError) {
    // console.warn("[Admin SDK - getDb] Admin instance not ready, attempting initialization (should have happened on module load).");
    initializeAdminAppSingleton(); // Attempt to initialize if not already done or failed
  }
  if (adminInstance) {
    return adminInstance.firestore();
  }
  // console.error("[Admin SDK - getDb] Firestore service unavailable. Admin SDK initialization failed or instance is null.");
  return null;
}

export function getAuthAdmin(): admin.auth.Auth | null {
  if (!adminInstance && !initializationError) {
    initializeAdminAppSingleton();
  }
  if (adminInstance) {
    return adminInstance.auth();
  }
  // console.error("[Admin SDK - getAuthAdmin] Auth service unavailable. Admin SDK initialization failed or instance is null.");
  return null;
}

export function getStorageAdmin(): admin.storage.Storage | null {
  if (!adminInstance && !initializationError) {
    initializeAdminAppSingleton();
  }
  if (adminInstance) {
    return adminInstance.storage();
  }
  // console.error("[Admin SDK - getStorageAdmin] Storage service unavailable. Admin SDK initialization failed or instance is null.");
  return null;
}

export function isAdminInitialized(): boolean {
  // If adminInstance is already set, it's initialized.
  // If not, but there's no error, try initializing. This handles lazy loading scenarios or if module load call didn't set it.
  if (!adminInstance && !initializationError) {
    initializeAdminAppSingleton();
  }
  // It's initialized if the instance is valid AND there was no persistent initialization error.
  return adminInstance !== null && initializationError === null;
}

// Static exports from admin.firestore are safe regardless of initialization success
export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';

// Export the admin namespace itself, useful for types or other static utilities
export { admin };

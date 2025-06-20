
// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminInstance: admin.app.App | null = null;
let initializationError: Error | null = null;
const ARIA_ADMIN_APP_NAME = 'ARIA_ADMIN_APP_PRIMARY_INSTANCE'; // Ensure a unique name

console.log("[Admin SDK] Module loaded. Initial state: adminInstance is null, initializationError is null.");

function initializeAdminAppSingleton(): void {
  console.log(`[Admin SDK] initializeAdminAppSingleton CALLED (Using Named App: ${ARIA_ADMIN_APP_NAME}).`);

  if (adminInstance) {
    console.log("[Admin SDK] Already initialized and instance cached. Returning.");
    return;
  }
  if (initializationError) {
    console.warn("[Admin SDK] Initialization previously failed. Not re-attempting. Error was:", initializationError.message);
    return;
  }

  try {
    console.log(`[Admin SDK] Checking for existing app named '${ARIA_ADMIN_APP_NAME}'.`);
    adminInstance = admin.app(ARIA_ADMIN_APP_NAME);
    console.log(`[Admin SDK] Existing named app '${ARIA_ADMIN_APP_NAME}' found. Project ID: ${adminInstance.options.projectId || 'N/A'}. Adopting it.`);
    initializationError = null;
    return;
  } catch (e: any) {
    if (e.code === 'app/no-app' || (e.message && e.message.includes("does not exist"))) {
      console.log(`[Admin SDK] No existing app named '${ARIA_ADMIN_APP_NAME}' found. Proceeding to initialize a new one.`);
    } else {
      const errorMsg = `Unexpected error while checking for existing named app '${ARIA_ADMIN_APP_NAME}': ${e.message}`;
      initializationError = new Error(errorMsg);
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("  Stack (checking named app):", e.stack);
      console.error("--------------------------------------------------------------------");
      return;
    }
  }

  console.log("[Admin SDK] Attempting to initialize a new Firebase Admin SDK instance...");
  const currentCwd = process.cwd();
  console.log(`[Admin SDK] Current working directory (process.cwd()): ${currentCwd}`);
  const serviceAccountPath = path.resolve(currentCwd, 'service-account-key.json');
  console.log(`[Admin SDK] Expected service account key path: ${serviceAccountPath}`);

  if (!fs.existsSync(serviceAccountPath)) {
    const errorMsg = `Service account key file not found at resolved path: ${serviceAccountPath}. Current CWD: ${currentCwd}. Ensure 'service-account-key.json' is in the project root directory or that the path is correctly resolved.`;
    initializationError = new Error(errorMsg);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    console.error("--------------------------------------------------------------------");
    return;
  }
  console.log("[Admin SDK] Service account key file FOUND at path:", serviceAccountPath);

  try {
    const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountFileContent);
    console.log("[Admin SDK] Service account key file parsed successfully.");

    if (!serviceAccount.project_id) {
      const errorMsg = "Service account key file is missing 'project_id'. Ensure it's the correct key from Firebase.";
      initializationError = new Error(errorMsg);
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("--------------------------------------------------------------------");
      return;
    }
    console.log(`[Admin SDK] Project ID from service account key: ${serviceAccount.project_id}`);

    let credential;
    try {
        credential = admin.credential.cert(serviceAccount);
        console.log("[Admin SDK] admin.credential.cert(serviceAccount) SUCCEEDED.");
    } catch (credError: any) {
        const errorMsg = `Error creating Firebase credential from service account: ${credError.message}`;
        initializationError = new Error(errorMsg); 
        console.error("--------------------------------------------------------------------");
        console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
        console.error("  Stack (credError):", credError.stack);
        console.error("--------------------------------------------------------------------");
        return;
    }

    console.log(`[Admin SDK] Calling admin.initializeApp() for '${ARIA_ADMIN_APP_NAME}'...`);
    adminInstance = admin.initializeApp({
      credential,
      projectId: serviceAccount.project_id,
    }, ARIA_ADMIN_APP_NAME);
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}. App name: ${adminInstance.name}`);
    initializationError = null;

  } catch (error: any) {
    const errorMsg = `Error during new Firebase Admin SDK initialization phase: ${error.message}`;
    initializationError = new Error(errorMsg);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    if (error.stack) console.error("  Stack (main init block):", error.stack.substring(0, 500));
    console.error("--------------------------------------------------------------------");
  }
}

initializeAdminAppSingleton(); // Attempt initialization when module is loaded

export function isAdminInitialized(): boolean {
  if (!adminInstance && !initializationError) {
    console.warn("[Admin SDK - isAdminInitialized] Admin instance not set and no prior error, re-attempting lazy initialization. This shouldn't happen frequently.");
    initializeAdminAppSingleton();
  }
  const isInit = adminInstance !== null && initializationError === null;
  if (!isInit) {
    console.warn(`[Admin SDK - isAdminInitialized Status] Returning ${isInit}. Final check: adminInstance is ${adminInstance ? 'VALID' : 'NULL'}, initializationError is ${initializationError ? `PRESENT ('${initializationError.message}')` : 'NULL'}`);
  } else {
     // console.log(`[Admin SDK - isAdminInitialized Status] Returning ${isInit}. (SDK is initialized and no error recorded)`);
  }
  return isInit;
}

export function getInitializationError(): string | null {
    if (initializationError) {
        return `Admin SDK Init Error: ${initializationError.message}${initializationError.stack ? ` | Stack (first 200 chars): ${initializationError.stack.substring(0,200)}...` : ''}`;
    }
    return null;
}

export function getDb(): admin.firestore.Firestore | null {
  if (!isAdminInitialized()) {
    console.error("[Admin SDK - getDb] Called when Admin SDK is not initialized. Initialization Error:", getInitializationError());
    return null;
  }
  try {
    return adminInstance!.firestore();
  } catch (e: any) {
    console.error("[Admin SDK - getDb] Error accessing firestore service from adminInstance:", e.message);
    initializationError = new Error(`Error accessing Firestore service after init: ${e.message}`);
    return null;
  }
}

export function getAuthAdmin(): admin.auth.Auth | null {
  if (!isAdminInitialized()) {
    console.error("[Admin SDK - getAuthAdmin] Called when Admin SDK is not initialized. Initialization Error:", getInitializationError());
    return null;
  }
   try {
    return adminInstance!.auth();
  } catch (e: any) {
    console.error("[Admin SDK - getAuthAdmin] Error accessing auth service from adminInstance:", e.message);
    initializationError = new Error(`Error accessing Auth service after init: ${e.message}`);
    return null;
  }
}

export function getStorageAdmin(): admin.storage.Storage | null {
  if (!isAdminInitialized()) {
    console.error("[Admin SDK - getStorageAdmin] Called when Admin SDK is not initialized. Initialization Error:", getInitializationError());
    return null;
  }
  try {
    return adminInstance!.storage();
  } catch (e: any) {
    console.error("[Admin SDK - getStorageAdmin] Error accessing storage service from adminInstance:", e.message);
    initializationError = new Error(`Error accessing Storage service after init: ${e.message}`);
    return null;
  }
}

export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin };

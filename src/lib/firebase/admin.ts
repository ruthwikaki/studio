
// src/lib/firebase/admin.ts
import * Fadmin from 'firebase-admin'; // Use Fadmin to avoid conflict with local 'admin' export
import * as fs from 'fs';
import * as path from 'path';

let adminInstance: Fadmin.app.App | null = null;
let initializationError: Error | null = null;
const ARIA_ADMIN_APP_NAME = 'ARIA_ADMIN_APP_PRIMARY_INSTANCE';

console.log(`[Admin SDK] Module loaded. Initial state: adminInstance is ${adminInstance ? 'set' : 'null'}, initializationError is ${initializationError ? initializationError.message : 'null'}.`);

function initializeAdminAppSingleton(): void {
  console.log(`[Admin SDK] initializeAdminAppSingleton CALLED (Using Named App: ${ARIA_ADMIN_APP_NAME}).`);

  if (adminInstance && !initializationError) {
    console.log(`[Admin SDK] Already initialized and instance cached ('${ARIA_ADMIN_APP_NAME}'). Project: ${adminInstance.options.projectId}. Returning.`);
    return;
  }
  if (initializationError) {
    console.warn(`[Admin SDK] Initialization previously failed for '${ARIA_ADMIN_APP_NAME}'. Not re-attempting. Error was: ${initializationError.message}`);
    return;
  }

  try {
    console.log(`[Admin SDK] Attempting to get existing app named '${ARIA_ADMIN_APP_NAME}'.`);
    adminInstance = Fadmin.app(ARIA_ADMIN_APP_NAME);
    console.log(`[Admin SDK] Existing named app '${ARIA_ADMIN_APP_NAME}' found and adopted. Project ID: ${adminInstance.options.projectId || 'N/A'}.`);
    initializationError = null;
    return;
  } catch (e: any) {
    if (e.code === 'app/no-app' || (e.message && e.message.includes("does not exist"))) {
      console.log(`[Admin SDK] No existing app named '${ARIA_ADMIN_APP_NAME}'. Proceeding to initialize a new one.`);
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
    const errorMsg = `Service account key file not found at resolved path: ${serviceAccountPath}. Current CWD: ${currentCwd}. Ensure 'service-account-key.json' is in the project root directory.`;
    initializationError = new Error(errorMsg);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    console.error("--------------------------------------------------------------------");
    return;
  }
  console.log("[Admin SDK] Service account key file FOUND at path:", serviceAccountPath);

  let serviceAccount;
  try {
    const serviceAccountFileContent = fs.readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(serviceAccountFileContent);
    console.log("[Admin SDK] Service account key file parsed successfully.");
  } catch (parseError: any) {
    const errorMsg = `Error parsing service account key file at ${serviceAccountPath}: ${parseError.message}`;
    initializationError = new Error(errorMsg);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    console.error("  Stack (parseError):", parseError.stack);
    console.error("--------------------------------------------------------------------");
    return;
  }

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
      credential = Fadmin.credential.cert(serviceAccount);
      console.log("[Admin SDK] Fadmin.credential.cert(serviceAccount) SUCCEEDED.");
  } catch (credError: any) {
      const errorMsg = `Error creating Firebase credential from service account: ${credError.message}`;
      initializationError = new Error(errorMsg);
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("  Stack (credError):", credError.stack);
      console.error("--------------------------------------------------------------------");
      return;
  }

  try {
    console.log(`[Admin SDK] Calling Fadmin.initializeApp() for '${ARIA_ADMIN_APP_NAME}' with projectId: ${serviceAccount.project_id}...`);
    adminInstance = Fadmin.initializeApp({
      credential,
      projectId: serviceAccount.project_id,
    }, ARIA_ADMIN_APP_NAME);

    if (!adminInstance || !adminInstance.options || !adminInstance.options.projectId) {
      const errorMsg = `Firebase Admin SDK initialized, but the resulting app instance or its projectId is invalid/missing. App Name: ${adminInstance?.name}, ProjectID from App Options: ${adminInstance?.options?.projectId}`;
      initializationError = new Error(errorMsg);
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("--------------------------------------------------------------------");
      adminInstance = null;
      return;
    }

    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for named app '${adminInstance.name}'. Project ID: ${adminInstance.options.projectId}`);
    initializationError = null; // Explicitly clear error on success
  } catch (error: any) {
    // This catch block is specifically for errors from initializeApp itself
    const errorMsg = `Error during new Firebase Admin SDK initialization for '${ARIA_ADMIN_APP_NAME}': ${error.message}`;
    initializationError = new Error(errorMsg); // Set the error
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    if (error.stack) console.error("  Stack (main init block):", error.stack.substring(0, 500));
    console.error("--------------------------------------------------------------------");
    adminInstance = null; // Ensure instance is null on failure
  }

  if (!adminInstance && !initializationError) {
    // This case should ideally not be reached if logic above is correct
    initializationError = new Error(`[Admin SDK] Initialization process for '${ARIA_ADMIN_APP_NAME}' completed, but adminInstance remains null and no specific error was caught. This is an unexpected state.`);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    console.error("--------------------------------------------------------------------");
  }
}

initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  const isInit = !!adminInstance && !initializationError;
  if (!isInit) {
    console.warn(`[Admin SDK - isAdminInitialized Status Check] Returning ${isInit}. Reason: adminInstance is ${adminInstance ? 'set' : 'null'}, initializationError is ${initializationError ? `'${initializationError.message}'` : 'null'}`);
  } else {
    // console.log(`[Admin SDK - isAdminInitialized Status Check] Returning true. Admin app '${adminInstance?.name}' on project '${adminInstance?.options.projectId}' is ready.`);
  }
  return isInit;
}

export function getInitializationError(): string | null {
    if (initializationError) {
        return `Admin SDK Init Error: ${initializationError.message}${initializationError.stack ? ` | Stack (first 200 chars): ${initializationError.stack.substring(0,200)}...` : ''}`;
    }
    if (!adminInstance) {
        return "Admin SDK Init Error: adminInstance is null, and no specific error was recorded during initialization. Check server startup logs for 'CRITICAL ERROR' messages from admin.ts.";
    }
    return null;
}

function getService<T>(serviceGetter: () => T, serviceName: string): T | null {
  if (!adminInstance && !initializationError) {
    console.warn(`[Admin SDK - get${serviceName}] adminInstance is null, and no prior initializationError. Attempting lazy re-initialization.`);
    initializeAdminAppSingleton();
  }
  if (!adminInstance || initializationError) {
    console.error(`[Admin SDK - get${serviceName}] Called when Admin SDK is not properly initialized. Error: ${getInitializationError()}`);
    return null;
  }
  try {
    return serviceGetter();
  } catch (e: any) {
    console.error(`[Admin SDK - get${serviceName}] Error accessing ${serviceName} service from adminInstance:`, e.message);
    if (!initializationError) initializationError = new Error(`Error accessing ${serviceName} service after init: ${e.message}`);
    return null;
  }
}

export function getDb(): Fadmin.firestore.Firestore | null {
  return getService(() => adminInstance!.firestore(), 'Db (Firestore)');
}

export function getAuthAdmin(): Fadmin.auth.Auth | null {
  return getService(() => adminInstance!.auth(), 'AuthAdmin');
}

export function getStorageAdmin(): Fadmin.storage.Storage | null {
  return getService(() => adminInstance!.storage(), 'StorageAdmin');
}

export const FieldValue = Fadmin.firestore.FieldValue;
export const AdminTimestamp = Fadmin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
// Export the Fadmin namespace itself if needed for types elsewhere, e.g., Fadmin.firestore.Timestamp
export { Fadmin as admin }; // Renamed to Fadmin to avoid conflict with local admin object

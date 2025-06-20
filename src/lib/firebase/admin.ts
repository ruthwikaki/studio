
// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminInstance: admin.app.App | null = null;
let initializationError: Error | null = null;
const ARIA_ADMIN_APP_NAME = 'ARIA_ADMIN_APP_PRIMARY_INSTANCE'; 

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
    console.log(`[Admin SDK] Attempting to get existing app named '${ARIA_ADMIN_APP_NAME}'.`);
    adminInstance = admin.app(ARIA_ADMIN_APP_NAME);
    console.log(`[Admin SDK] Existing named app '${ARIA_ADMIN_APP_NAME}' found and adopted. Project ID: ${adminInstance.options.projectId || 'N/A'}.`);
    initializationError = null; // Clear any prior conceptual error if we successfully got an app.
    return;
  } catch (e: any) {
    // Expected error if the app doesn't exist, so we'll initialize it.
    if (e.code !== 'app/no-app' && !(e.message && e.message.includes("does not exist"))) {
      const errorMsg = `Unexpected error while checking for existing named app '${ARIA_ADMIN_APP_NAME}': ${e.message}`;
      initializationError = new Error(errorMsg);
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("  Stack (checking named app):", e.stack);
      console.error("--------------------------------------------------------------------");
      return;
    }
    console.log(`[Admin SDK] No existing app named '${ARIA_ADMIN_APP_NAME}'. Proceeding to initialize a new one.`);
  }

  console.log("[Admin SDK] Attempting to initialize a new Firebase Admin SDK instance...");
  const currentCwd = process.cwd();
  console.log(`[Admin SDK] Current working directory (process.cwd()): ${currentCwd}`);
  const serviceAccountPath = path.resolve(currentCwd, 'service-account-key.json');
  console.log(`[Admin SDK] Expected service account key path: ${serviceAccountPath}`);

  if (!fs.existsSync(serviceAccountPath)) {
    const errorMsg = `Service account key file not found at resolved path: ${serviceAccountPath}. Current CWD: ${currentCwd}. Ensure 'service-account-key.json' is in the project root directory or that the path is correctly resolved in this Next.js environment.`;
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

    console.log(`[Admin SDK] Calling admin.initializeApp() for '${ARIA_ADMIN_APP_NAME}' with projectId: ${serviceAccount.project_id}...`);
    adminInstance = admin.initializeApp({
      credential,
      projectId: serviceAccount.project_id,
    }, ARIA_ADMIN_APP_NAME);
    
    // Crucial check after initializeApp
    if (!adminInstance || !adminInstance.options || !adminInstance.options.projectId) {
      const errorMsg = `Firebase Admin SDK initialized, but the resulting app instance or its projectId is invalid/missing. App Name: ${adminInstance?.name}, ProjectID from App Options: ${adminInstance?.options?.projectId}`;
      initializationError = new Error(errorMsg);
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("--------------------------------------------------------------------");
      adminInstance = null; // Ensure adminInstance is null if the app object is not valid
      return;
    }

    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully. App name: ${adminInstance.name}, Project ID: ${adminInstance.options.projectId}`);
    initializationError = null; // Clear any prior error if we successfully initialized

  } catch (error: any) {
    const errorMsg = `Error during new Firebase Admin SDK initialization: ${error.message}`;
    initializationError = new Error(errorMsg);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    if (error.stack) console.error("  Stack (main init block):", error.stack.substring(0, 500));
    console.error("--------------------------------------------------------------------");
  }
  
  // Final check: if adminInstance is still null and no specific error was caught, set a generic one.
  if (!adminInstance && !initializationError) {
    initializationError = new Error("[Admin SDK] Initialization process completed, but adminInstance remains null. This is an unexpected state, possibly due to an unhandled issue in initializeApp or credential creation.");
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    console.error("--------------------------------------------------------------------");
  }
}

// Attempt initialization when module is loaded
initializeAdminAppSingleton(); 

export function isAdminInitialized(): boolean {
  // If adminInstance is already set and no error, we are good.
  if (adminInstance && !initializationError) {
    // console.log("[Admin SDK - isAdminInitialized Status] Returning true (instance exists, no error).");
    return true;
  }
  // If there's a definitive initializationError, we are not initialized.
  if (initializationError) {
    console.warn(`[Admin SDK - isAdminInitialized Status] Returning false. Reason: initializationError is set: '${initializationError.message}'`);
    return false;
  }
  // Fallback: adminInstance is null, and initializationError is also null.
  // This implies initialization was attempted but didn't set adminInstance, and didn't throw/catch an error that set initializationError.
  // This state should ideally be caught by the final check in initializeAdminAppSingleton, but as a safeguard:
  console.warn("[Admin SDK - isAdminInitialized Status] Returning false. Reason: adminInstance is null and no specific initializationError was recorded. This implies a silent failure during init or init was never effectively run.");
  return false;
}

export function getInitializationError(): string | null {
    if (initializationError) {
        return `Admin SDK Init Error: ${initializationError.message}${initializationError.stack ? ` | Stack (first 200 chars): ${initializationError.stack.substring(0,200)}...` : ''}`;
    }
    // If adminInstance is also null, it means initialization failed without setting the error explicitly.
    if (!adminInstance) {
        return "Admin SDK Init Error: adminInstance is null, and no specific error was recorded during initialization. Check server startup logs for 'CRITICAL ERROR' messages from admin.ts.";
    }
    return null;
}

export function getDb(): admin.firestore.Firestore | null {
  if (!adminInstance) {
    if (!initializationError) console.error("[Admin SDK - getDb] adminInstance is null, and no prior initializationError was set. Attempting to re-initialize.");
    initializeAdminAppSingleton(); // Attempt re-initialization
  }
  if (!isAdminInitialized() || !adminInstance) { // Re-check after potential re-init attempt
    console.error("[Admin SDK - getDb] Called when Admin SDK is not properly initialized. Current Initialization Error:", getInitializationError());
    return null;
  }
  try {
    return adminInstance.firestore();
  } catch (e: any) {
    console.error("[Admin SDK - getDb] Error accessing firestore service from adminInstance:", e.message);
    if (!initializationError) initializationError = new Error(`Error accessing Firestore service after init: ${e.message}`);
    return null;
  }
}

export function getAuthAdmin(): admin.auth.Auth | null {
  if (!adminInstance) {
    if (!initializationError) console.error("[Admin SDK - getAuthAdmin] adminInstance is null, and no prior initializationError was set. Attempting to re-initialize.");
    initializeAdminAppSingleton();
  }
  if (!isAdminInitialized() || !adminInstance) {
    console.error("[Admin SDK - getAuthAdmin] Called when Admin SDK is not properly initialized. Current Initialization Error:", getInitializationError());
    return null;
  }
   try {
    return adminInstance.auth();
  } catch (e: any) {
    console.error("[Admin SDK - getAuthAdmin] Error accessing auth service from adminInstance:", e.message);
    if (!initializationError) initializationError = new Error(`Error accessing Auth service after init: ${e.message}`);
    return null;
  }
}

export function getStorageAdmin(): admin.storage.Storage | null {
  if (!adminInstance) {
    if (!initializationError) console.error("[Admin SDK - getStorageAdmin] adminInstance is null, and no prior initializationError was set. Attempting to re-initialize.");
    initializeAdminAppSingleton();
  }
  if (!isAdminInitialized() || !adminInstance) {
    console.error("[Admin SDK - getStorageAdmin] Called when Admin SDK is not properly initialized. Current Initialization Error:", getInitializationError());
    return null;
  }
  try {
    return adminInstance.storage();
  } catch (e: any) {
    console.error("[Admin SDK - getStorageAdmin] Error accessing storage service from adminInstance:", e.message);
    if (!initializationError) initializationError = new Error(`Error accessing Storage service after init: ${e.message}`);
    return null;
  }
}

export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin }; // Export the admin namespace itself for types like admin.firestore.Timestamp
    
    
    
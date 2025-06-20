
// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminInstance: admin.app.App | null = null;
let initializationError: Error | null = null;

console.log("[Admin SDK] Module loaded. Initial state: adminInstance is null, initializationError is null.");

function initializeAdminAppSingleton(): admin.app.App | null {
  console.log("[Admin SDK] initializeAdminAppSingleton CALLED (Robust Approach).");

  if (adminInstance) {
    console.log("[Admin SDK] Already initialized and instance cached. Returning existing instance.");
    return adminInstance;
  }
  if (initializationError) {
    console.warn("[Admin SDK] Initialization previously failed. Returning null. Error was:", initializationError.message);
    return null;
  }

  try {
    console.log("[Admin SDK] Checking for existing default app using admin.app().");
    const existingApp = admin.app(); 
    console.log(`[Admin SDK] Existing default app found. Project ID: ${existingApp.options.projectId || 'N/A'}. Adopting it.`);
    adminInstance = existingApp;
    initializationError = null; 
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING existing default app instance.");
    return adminInstance;
  } catch (e: any) {
    if (e.code === 'app/no-app' || (e.message && e.message.toLowerCase().includes("the default firebase app does not exist"))) {
      console.log("[Admin SDK] No existing default app found (admin.app() threw expected error). Proceeding to initialize a new one.");
    } else {
      const errorMsg = `Unexpected error while checking for existing app with admin.app(): ${e.message}`;
      initializationError = new Error(errorMsg); 
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("  Stack (admin.app() check):", e.stack);
      console.error("--------------------------------------------------------------------");
      console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to unexpected error from admin.app().");
      return null;
    }
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
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to missing key file.");
    return null;
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
      console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to missing project_id in key file.");
      return null;
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
        console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to credential creation error.");
        return null; 
    }

    console.log("[Admin SDK] Calling admin.initializeApp() with new credentials...");
    adminInstance = admin.initializeApp({
      credential,
      projectId: serviceAccount.project_id,
    }, 'ARIA_ADMIN_APP'); // Using a named app instance
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}. App name: ${adminInstance.name}`);
    initializationError = null;
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING new app instance.");
    return adminInstance;

  } catch (error: any) {
     if (error.code === 'app/duplicate-app') {
        console.warn(`[Admin SDK] Warning: Firebase app named 'ARIA_ADMIN_APP' already exists. Attempting to use it.`);
        try {
            adminInstance = admin.app('ARIA_ADMIN_APP'); 
            initializationError = null;
            console.log(`[Admin SDK] Successfully retrieved existing app 'ARIA_ADMIN_APP'. Project ID: ${adminInstance.options.projectId || 'N/A'}`);
            console.log("[Admin SDK] initializeAdminAppSingleton RETURNING existing app (after duplicate app error).");
            return adminInstance;
        } catch (e: any) {
            const errorMsg = `CRITICAL: 'app/duplicate-app' caught for 'ARIA_ADMIN_APP', but subsequent call to admin.app('ARIA_ADMIN_APP') also failed: ${e.message}`;
            initializationError = new Error(errorMsg);
            console.error("--------------------------------------------------------------------");
            console.error(`[Admin SDK] ${initializationError.message}`);
            console.error("  Stack (duplicate-app fallback error):", e.stack);
            console.error("--------------------------------------------------------------------");
            console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null after duplicate-app and fallback failure.");
            return null;
        }
    }

    const errorMsg = `Error during new Firebase Admin SDK initialization phase: ${error.message}`;
    initializationError = new Error(errorMsg);
    console.error("--------------------------------------------------------------------");
    console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
    if (error.stack) console.error("  Stack (main init block):", error.stack.substring(0, 500));
    console.error("--------------------------------------------------------------------");
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to caught error in new init phase.");
    return null;
  }
}

initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  console.log("[Admin SDK - isAdminInitialized CALLED]");
  if (!adminInstance && !initializationError) {
    console.warn("  [isAdminInitialized LAZY INIT ATTEMPT] Admin instance not set and no prior error, re-attempting lazy initialization.");
    initializeAdminAppSingleton();
  }
  const isInit = adminInstance !== null && initializationError === null;
  if (!isInit) {
    console.warn(`  [isAdminInitialized Status] Returning ${isInit}. Final check: adminInstance is ${adminInstance ? 'VALID' : 'NULL'}, initializationError is ${initializationError ? `PRESENT ('${initializationError.message}')` : 'NULL'}`);
  } else {
    console.log(`  [isAdminInitialized Status] Returning ${isInit}. (SDK is initialized and no error recorded)`);
  }
  return isInit;
}

export function getInitializationError(): string | null {
    if (initializationError) {
        return `Admin SDK Init Error: ${initializationError.message}${initializationError.stack ? ` | Stack (first 200 chars): ${initializationError.stack.substring(0,200)}...` : ''}`;
    }
    return null;
}

function getAdminInstance(): admin.app.App | null {
  if (!adminInstance && !initializationError) {
    console.warn("[Admin SDK - getAdminInstance] Called when adminInstance is null and no prior error. Attempting init.");
    initializeAdminAppSingleton();
  }
  if (!adminInstance) {
    console.error("[Admin SDK - getAdminInstance] Admin instance is null. Initialization error:", getInitializationError());
  }
  return adminInstance;
}

export function getDb(): admin.firestore.Firestore | null {
  const app = getAdminInstance();
  if (app) {
    try {
      return app.firestore();
    } catch (e: any) {
      console.error("[Admin SDK - getDb] Error accessing firestore service from adminInstance:", e.message);
      initializationError = new Error(`Error accessing Firestore service: ${e.message}`);
      return null;
    }
  }
  return null;
}

export function getAuthAdmin(): admin.auth.Auth | null {
  const app = getAdminInstance();
  if (app) {
     try {
      return app.auth();
    } catch (e: any) {
      console.error("[Admin SDK - getAuthAdmin] Error accessing auth service from adminInstance:", e.message);
      initializationError = new Error(`Error accessing Auth service: ${e.message}`);
      return null;
    }
  }
  return null;
}

export function getStorageAdmin(): admin.storage.Storage | null {
  const app = getAdminInstance();
  if (app) {
    try {
      return app.storage();
    } catch (e: any) {
      console.error("[Admin SDK - getStorageAdmin] Error accessing storage service from adminInstance:", e.message);
      initializationError = new Error(`Error accessing Storage service: ${e.message}`);
      return null;
    }
  }
  return null;
}

export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin };

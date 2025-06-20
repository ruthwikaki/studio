
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
    // Attempt to get the default app if it already exists
    // admin.app() throws an error if the default app doesn't exist.
    console.log("[Admin SDK] Checking for existing default app using admin.app().");
    const existingApp = admin.app(); // This will throw if no app is initialized
    console.log(`[Admin SDK] Existing default app found. Project ID: ${existingApp.options.projectId || 'N/A'}. Adopting it.`);
    adminInstance = existingApp;
    initializationError = null; // Clear any prior theoretical error
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING existing default app instance.");
    return adminInstance;
  } catch (e: any) {
    // FirebaseError: The default Firebase app does not exist. Make sure to initialize the SDK before calling Man.app().
    if (e.code === 'app/no-app' || (e.message && e.message.toLowerCase().includes("the default firebase app does not exist"))) {
      console.log("[Admin SDK] No existing default app found (admin.app() threw expected error). Proceeding to initialize a new one.");
    } else {
      // Some other unexpected error from admin.app() itself
      const errorMsg = `Unexpected error while checking for existing app with admin.app(): ${e.message}`;
      initializationError = new Error(errorMsg); // Set the error
      console.error("--------------------------------------------------------------------");
      console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
      console.error("  Stack (admin.app() check):", e.stack);
      console.error("--------------------------------------------------------------------");
      console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to unexpected error from admin.app().");
      return null;
    }
  }

  // If we reach here, no default app existed, so initialize a new one.
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
        initializationError = new Error(errorMsg); // Make sure this is an Error object
        console.error("--------------------------------------------------------------------");
        console.error(`[Admin SDK] CRITICAL ERROR: ${initializationError.message}`);
        console.error("  Stack (credError):", credError.stack);
        console.error("--------------------------------------------------------------------");
        console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to credential creation error.");
        return null; // Exit early
    }

    console.log("[Admin SDK] Calling admin.initializeApp() with new credentials...");
    adminInstance = admin.initializeApp({
      credential,
      projectId: serviceAccount.project_id,
    });
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}. App name: ${adminInstance.name}`);
    initializationError = null; // Clear any previous error if re-attempted and successful
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING new app instance.");
    return adminInstance;

  } catch (error: any) {
    // Catch errors from parsing, file reading, or initializeApp itself during the new init phase
     if (error.code === 'app/duplicate-app') {
        console.warn(`[Admin SDK] Warning: Firebase app already exists (caught 'app/duplicate-app' during explicit new initialization). This implies admin.app() might have succeeded or another init happened. Attempting to use admin.app().`);
        try {
            adminInstance = admin.app(); // Get the (supposedly) already initialized app
            initializationError = null;
            console.log(`[Admin SDK] Successfully retrieved existing app after 'app/duplicate-app' error. Project ID: ${adminInstance.options.projectId || 'N/A'}`);
            console.log("[Admin SDK] initializeAdminAppSingleton RETURNING existing app (after duplicate app error).");
            return adminInstance;
        } catch (e: any) {
            const errorMsg = `CRITICAL: 'app/duplicate-app' caught, but subsequent call to admin.app() also failed: ${e.message}`;
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

// Eagerly attempt initialization when the module is first loaded.
initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  console.log("[Admin SDK - isAdminInitialized CALLED]");
  // If adminInstance is not set, and there was no previous error, try to initialize.
  // This handles cases where this module might be imported before the eager init completes,
  // or if the eager init had a recoverable issue that a subsequent call might fix (though unlikely with current logic).
  if (!adminInstance && !initializationError) {
    console.warn("  [isAdminInitialized LAZY INIT ATTEMPT] Admin instance not set and no prior error, re-attempting lazy initialization.");
    initializeAdminAppSingleton();
  }

  const isInit = adminInstance !== null && initializationError === null;
  if (!isInit) {
    console.warn(`  [isAdminInitialized Status] Returning ${isInit}. Final check: adminInstance is ${adminInstance ? 'VALID' : 'NULL'}, initializationError is ${initializationError ? `PRESENT ('${initializationError.message}')` : 'NULL'}`);
  } else {
    console.log(`  [isAdminInitialized Status] Returning ${isInit}. (SDK is initialized)`);
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
  if (!adminInstance && !initializationError) {
    console.warn("[Admin SDK - getDb] Called when adminInstance is null and no prior error. Attempting init.");
    initializeAdminAppSingleton();
  }
  if (adminInstance && !initializationError) {
    try {
      return adminInstance.firestore();
    } catch (e: any) {
      console.error("[Admin SDK - getDb] Error accessing firestore service from adminInstance:", e.message);
      initializationError = new Error(`Error accessing Firestore service: ${e.message}`); // Update global error state
      return null;
    }
  }
  console.error("[Admin SDK - getDb] Returning null for Firestore. adminInstance is " + (adminInstance ? "VALID" : "NULL") + ", initializationError is " + (initializationError ? `'${initializationError.message}'` : "NULL"));
  return null;
}

export function getAuthAdmin(): admin.auth.Auth | null {
  if (!adminInstance && !initializationError) {
    console.warn("[Admin SDK - getAuthAdmin] Called when adminInstance is null and no prior error. Attempting init.");
    initializeAdminAppSingleton();
  }
  if (adminInstance && !initializationError) {
     try {
      return adminInstance.auth();
    } catch (e: any) {
      console.error("[Admin SDK - getAuthAdmin] Error accessing auth service from adminInstance:", e.message);
      initializationError = new Error(`Error accessing Auth service: ${e.message}`);
      return null;
    }
  }
  console.error("[Admin SDK - getAuthAdmin] Returning null for Auth. adminInstance is " + (adminInstance ? "VALID" : "NULL") + ", initializationError is " + (initializationError ? `'${initializationError.message}'` : "NULL"));
  return null;
}

export function getStorageAdmin(): admin.storage.Storage | null {
  if (!adminInstance && !initializationError) {
    console.warn("[Admin SDK - getStorageAdmin] Called when adminInstance is null and no prior error. Attempting init.");
    initializeAdminAppSingleton();
  }
  if (adminInstance && !initializationError) {
    try {
      return adminInstance.storage();
    } catch (e: any) {
      console.error("[Admin SDK - getStorageAdmin] Error accessing storage service from adminInstance:", e.message);
      initializationError = new Error(`Error accessing Storage service: ${e.message}`);
      return null;
    }
  }
  console.error("[Admin SDK - getStorageAdmin] Returning null for Storage. adminInstance is " + (adminInstance ? "VALID" : "NULL") + ", initializationError is " + (initializationError ? `'${initializationError.message}'` : "NULL"));
  return null;
}

export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp; // Keep this specific export if used
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore'; // Keep this type export
export { admin }; // Export the whole admin namespace as well

    
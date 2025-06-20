// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminInstance: admin.app.App | null = null;
let initializationError: Error | null = null;

console.log("[Admin SDK] Module loaded. Initial state: adminInstance is null, initializationError is null.");

function initializeAdminAppSingleton(): admin.app.App | null {
  console.log("[Admin SDK] initializeAdminAppSingleton CALLED.");

  if (adminInstance) {
    console.log("[Admin SDK] Already initialized. Returning existing instance.");
    return adminInstance;
  }
  if (initializationError) {
    console.warn("[Admin SDK] Initialization previously failed. Returning null. Error was:", initializationError.message);
    return null;
  }
  
  console.log("[Admin SDK] Attempting to initialize Firebase Admin SDK...");
  const currentCwd = process.cwd();
  console.log(`[Admin SDK] Current working directory (process.cwd()): ${currentCwd}`);

  const serviceAccountPath = path.resolve(currentCwd, 'service-account-key.json');
  console.log(`[Admin SDK] Expected service account key path: ${serviceAccountPath}`);

  if (admin.apps.length > 0) {
    const defaultApp = admin.apps.find(app => app?.name === '[DEFAULT]');
    if (defaultApp) {
      console.log(`[Admin SDK] Using existing [DEFAULT] Firebase Admin app instance. Project ID: ${defaultApp.options.projectId || 'N/A'}`);
      adminInstance = defaultApp;
      initializationError = null; // Clear any prior theoretical error if we successfully adopt an existing app
      console.log("[Admin SDK] initializeAdminAppSingleton RETURNING existing app instance.");
      return adminInstance;
    }
    console.warn(`[Admin SDK] Other Firebase apps initialized (${admin.apps.map(a => a?.name).join(', ')}), but [DEFAULT] not found. Proceeding to initialize a new [DEFAULT] app.`);
  }

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

    adminInstance = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    }, '[DEFAULT]'); // Explicitly name the app as [DEFAULT]
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}. App name: ${adminInstance.name}`);
    initializationError = null; // Clear any previous error if re-attempted and successful
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING new app instance.");
    return adminInstance;

  } catch (error: any) {
    initializationError = error; // Store the actual error object
    console.error("--------------------------------------------------------------------");
    console.error("[Admin SDK] CRITICAL ERROR INITIALIZING FIREBASE ADMIN SDK (in try-catch block):");
    if (error.code === 'ENOENT' || (error.message && error.message.toLowerCase().includes("no such file or directory"))) {
      console.error(`  Reason: The 'service-account-key.json' file was not found or was unreadable at the resolved path during readFileSync.`);
      console.error(`  Checked path: ${serviceAccountPath}`);
    } else if (error.message && (error.message.includes("Failed to parse service account KeyFile") || error.message.includes("Credential implementation provided to initializeApp()"))) {
       console.error("  Reason: The 'service-account-key.json' file seems to be invalid or incomplete (e.g., not valid JSON).");
    } else if (error.code === 'app/duplicate-app') {
        console.warn(`[Admin SDK] Warning: Firebase app named '[DEFAULT]' already exists (caught in initializeApp). This can happen with hot-reloading. Attempting to use existing app.`);
        const existingDefaultApp = admin.apps.find(app => app?.name === '[DEFAULT]');
        if (existingDefaultApp) {
            adminInstance = existingDefaultApp;
            initializationError = null; // Clear error as we are using existing
            console.log(`[Admin SDK] Successfully retrieved existing [DEFAULT] app. Project ID: ${adminInstance.options.projectId || 'N/A'}`);
            console.log("[Admin SDK] initializeAdminAppSingleton RETURNING existing app (after duplicate app error).");
            return adminInstance;
        } else {
            console.error(`[Admin SDK] CRITICAL ERROR: 'app/duplicate-app' error but could not retrieve existing [DEFAULT] app.`);
            // initializationError is already set to the duplicate app error from the catch.
        }
    } else {
      console.error("  Reason for initialization failure:", error.message);
      if (error.stack) console.error("  Stack (partial):", error.stack.substring(0, 500));
    }
    console.error("  ACTION: Please ensure 'service-account-key.json' is valid and correctly placed relative to the server's CWD, or check other logged errors.");
    console.error("--------------------------------------------------------------------");
    console.log("[Admin SDK] initializeAdminAppSingleton RETURNING null due to caught error.");
    return null;
  }
}

// Eagerly attempt initialization when the module is first loaded.
initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  console.log("[Admin SDK - isAdminInitialized CALLED]");
  console.log(`  State before (potential) lazy init: adminInstance is ${adminInstance ? 'set' : 'null'}, initializationError is ${initializationError ? `present ('${initializationError.message}')` : 'null'}`);
  if (!adminInstance && !initializationError) {
    console.warn("  [Lazy Init Attempt] Admin instance not set and no prior error, attempting lazy initialization.");
    initializeAdminAppSingleton(); // Attempt to initialize if not already
    console.log(`  State after lazy init attempt: adminInstance is ${adminInstance ? 'set' : 'null'}, initializationError is ${initializationError ? `present ('${initializationError.message}')` : 'null'}`);
  }
  
  const isInit = adminInstance !== null && initializationError === null;
  
  if (!isInit) {
    console.warn(`  [isAdminInitialized Status] Returning ${isInit}. Final check: adminInstance is ${adminInstance ? 'set' : 'null'}, initializationError is ${initializationError ? `present ('${initializationError.message}')` : 'null'}`);
  } else {
    console.log(`  [isAdminInitialized Status] Returning ${isInit}. (SDK is initialized)`);
  }
  return isInit;
}

export function getInitializationError(): string | null {
    if (initializationError) {
        return `Admin SDK Init Error: ${initializationError.message}${initializationError.stack ? ` | Stack: ${initializationError.stack.substring(0,200)}...` : ''}`;
    }
    return null;
}

export function getDb(): admin.firestore.Firestore | null {
  if (!adminInstance && !initializationError) {
    // This secondary check is a safeguard, primary initialization happens at module load or in isAdminInitialized
    console.warn("[Admin SDK - getDb] Called when adminInstance is null and no prior error. Attempting init.");
    initializeAdminAppSingleton();
  }
  if (adminInstance) {
    return adminInstance.firestore();
  }
  console.error("[Admin SDK - getDb] Returning null for Firestore because adminInstance is null.");
  if (initializationError) console.error("  Reason (from initializationError):", initializationError.message);
  return null;
}

export function getAuthAdmin(): admin.auth.Auth | null {
  if (!adminInstance && !initializationError) {
    console.warn("[Admin SDK - getAuthAdmin] Called when adminInstance is null and no prior error. Attempting init.");
    initializeAdminAppSingleton();
  }
  if (adminInstance) {
    return adminInstance.auth();
  }
  console.error("[Admin SDK - getAuthAdmin] Returning null for Auth because adminInstance is null.");
  if (initializationError) console.error("  Reason (from initializationError):", initializationError.message);
  return null;
}

export function getStorageAdmin(): admin.storage.Storage | null {
  if (!adminInstance && !initializationError) {
    console.warn("[Admin SDK - getStorageAdmin] Called when adminInstance is null and no prior error. Attempting init.");
    initializeAdminAppSingleton();
  }
  if (adminInstance) {
    return adminInstance.storage();
  }
  console.error("[Admin SDK - getStorageAdmin] Returning null for Storage because adminInstance is null.");
  if (initializationError) console.error("  Reason (from initializationError):", initializationError.message);
  return null;
}

export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin };

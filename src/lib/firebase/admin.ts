// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

let adminInstance: admin.app.App | null = null;
let initializationError: Error | null = null;

function initializeAdminAppSingleton(): admin.app.App | null {
  if (adminInstance) {
    // console.log("[Admin SDK] Already initialized. Returning existing instance.");
    return adminInstance;
  }
  if (initializationError) {
    // console.warn("[Admin SDK] Initialization previously failed and will not be re-attempted in this singleton call. Error:", initializationError.message);
    return null;
  }
  
  console.log("[Admin SDK] Attempting to initialize Firebase Admin SDK...");
  console.log(`[Admin SDK] Current working directory (process.cwd()): ${process.cwd()}`);

  const serviceAccountPath = path.resolve(process.cwd(), 'service-account-key.json');
  console.log(`[Admin SDK] Expected service account key path: ${serviceAccountPath}`);

  if (admin.apps.length > 0) {
    const defaultApp = admin.apps.find(app => app?.name === '[DEFAULT]');
    if (defaultApp) {
      console.log(`[Admin SDK] Using existing [DEFAULT] Firebase Admin app instance. Project ID: ${defaultApp.options.projectId || 'N/A'}`);
      adminInstance = defaultApp;
      return adminInstance;
    }
    console.warn(`[Admin SDK] Other Firebase apps initialized, but [DEFAULT] not found. Proceeding to initialize a new [DEFAULT] app.`);
  }

  if (!fs.existsSync(serviceAccountPath)) {
    initializationError = new Error(`Service account key file not found at resolved path: ${serviceAccountPath}. Current CWD: ${process.cwd()}. Ensure 'service-account-key.json' is in the project root directory or that the path is correctly resolved in this Next.js environment.`);
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
    }, '[DEFAULT]'); // Explicitly name the app as [DEFAULT]
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}. App name: ${adminInstance.name}`);
    initializationError = null; // Clear any previous error if re-attempted and successful
    return adminInstance;

  } catch (error: any) {
    initializationError = error;
    console.error("--------------------------------------------------------------------");
    console.error("[Admin SDK] CRITICAL ERROR INITIALIZING FIREBASE ADMIN SDK:");
    if (error.code === 'ENOENT' || (error.message && error.message.toLowerCase().includes("no such file or directory"))) {
      console.error(`  Reason: The 'service-account-key.json' file was not found or was unreadable at the resolved path.`);
      console.error(`  Checked path: ${serviceAccountPath}`);
    } else if (error.message && (error.message.includes("Failed to parse service account KeyFile") || error.message.includes("Credential implementation provided to initializeApp()"))) {
       console.error("  Reason: The 'service-account-key.json' file seems to be invalid or incomplete (e.g., not valid JSON).");
    } else if (error.code === 'app/duplicate-app') {
        console.warn(`[Admin SDK] Warning: Firebase app named '[DEFAULT]' already exists. This can happen with hot-reloading. Attempting to use existing app.`);
        const existingDefaultApp = admin.apps.find(app => app?.name === '[DEFAULT]');
        if (existingDefaultApp) {
            adminInstance = existingDefaultApp;
            initializationError = null; // Clear error as we are using existing
            console.log(`[Admin SDK] Successfully retrieved existing [DEFAULT] app. Project ID: ${adminInstance.options.projectId || 'N/A'}`);
            return adminInstance;
        } else {
            console.error(`[Admin SDK] CRITICAL ERROR: 'app/duplicate-app' error but could not retrieve existing [DEFAULT] app.`);
        }
    }
     else {
      console.error("  Reason:", error.message);
      if (error.stack) console.error("  Stack (partial):", error.stack.substring(0, 500));
    }
    console.error("  ACTION: Please ensure 'service-account-key.json' is valid and correctly placed relative to the server's CWD, or check other logged errors.");
    console.error("--------------------------------------------------------------------");
    return null;
  }
}

// Eagerly attempt initialization when the module is first loaded.
initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  // This check ensures that if the module was loaded but initialization was deferred or failed,
  // it gets one more chance here.
  if (!adminInstance && !initializationError) {
    // console.warn("[Admin SDK - isAdminInitialized Check] Admin instance not set and no prior error, attempting lazy initialization.");
    initializeAdminAppSingleton();
  }
  const isInit = adminInstance !== null && initializationError === null;
  if (!isInit) {
    // This log will appear every time an API route calls isAdminInitialized and it's false.
    console.warn(`[Admin SDK - isAdminInitialized Status] Returning ${isInit}. adminInstance is ${adminInstance ? 'set' : 'null'}, initializationError is ${initializationError ? `present: '${initializationError.message}'` : 'null'}`);
  }
  return isInit;
}

export function getInitializationError(): string | null {
    return initializationError ? initializationError.message : null;
}

export function getDb(): admin.firestore.Firestore | null {
  if (!adminInstance) {
    if (!initializationError) {
      // console.warn("[Admin SDK - getDb] Admin instance not set, attempting lazy initialization.");
      initializeAdminAppSingleton(); // Attempt to initialize if not already
    }
    if (!adminInstance) { // Check again after attempt
      // console.error("[Admin SDK - getDb] Admin SDK not initialized. Returning null for Firestore.", initializationError ? `Reason: ${initializationError.message}` : "Reason: adminInstance is null post-init attempt.");
      return null;
    }
  }
  return adminInstance.firestore();
}

export function getAuthAdmin(): admin.auth.Auth | null {
  if (!adminInstance) {
    if (!initializationError) {
      initializeAdminAppSingleton();
    }
    if (!adminInstance) {
      // console.error("[Admin SDK - getAuthAdmin] Admin SDK not initialized. Returning null for Auth.", initializationError ? `Reason: ${initializationError.message}` : "Reason: adminInstance is null post-init attempt.");
      return null;
    }
  }
  return adminInstance.auth();
}

export function getStorageAdmin(): admin.storage.Storage | null {
  if (!adminInstance) {
    if (!initializationError) {
      initializeAdminAppSingleton();
    }
    if (!adminInstance) {
      // console.error("[Admin SDK - getStorageAdmin] Admin SDK not initialized. Returning null for Storage.", initializationError ? `Reason: ${initializationError.message}` : "Reason: adminInstance is null post-init attempt.");
      return null;
    }
  }
  return adminInstance.storage();
}

export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin };

    

// src/lib/firebase/admin.ts
import * as Fadmin from 'firebase-admin'; // Renamed to Fadmin to avoid conflict with local 'admin' export
import path from 'path';
import fs from 'fs';

console.log('[Admin SDK] Module loaded. Attempting to initialize Firebase Admin SDK...');

let adminInstance: Fadmin.app.App | null = null;
let initializationError: Error | null = null;
const ARIA_ADMIN_APP_NAME = 'ARIA_ADMIN_APP_PRIMARY_INSTANCE';

function initializeAdminAppSingleton(): void {
  console.log(`[Admin SDK] initializeAdminAppSingleton CALLED (Robust Approach). Current apps: ${Fadmin.apps.length}`);
  if (adminInstance) {
    console.log('[Admin SDK] Admin SDK already initialized or initialization attempted.');
    return;
  }

  try {
    // Try to get the named app if it was somehow initialized elsewhere or in a previous attempt
    if (Fadmin.apps.some(app => app?.name === ARIA_ADMIN_APP_NAME)) {
      adminInstance = Fadmin.app(ARIA_ADMIN_APP_NAME);
      console.log(`[Admin SDK] Re-using existing Firebase Admin app instance: ${ARIA_ADMIN_APP_NAME}`);
      initializationError = null; // Clear any previous error if we successfully got an instance
      return;
    }

    const currentWorkingDirectory = process.cwd();
    console.log(`[Admin SDK] Current working directory (process.cwd()): ${currentWorkingDirectory}`);
    
    const serviceAccountPath = path.resolve(currentWorkingDirectory, 'service-account-key.json');
    console.log(`[Admin SDK] Expected service account key path: ${serviceAccountPath}`);

    if (!fs.existsSync(serviceAccountPath)) {
      const err = new Error(`Service account key file not found at resolved path: ${serviceAccountPath}. Current CWD: ${currentWorkingDirectory}. Ensure 'service-account-key.json' is in the project root directory or that the path is correctly resolved in this Next.js environment.`);
      console.error('[Admin SDK] CRITICAL ERROR:', err.message);
      initializationError = err;
      adminInstance = null;
      return;
    }
    console.log('[Admin SDK] Service account key file found.');

    let serviceAccount;
    try {
      const serviceAccountString = fs.readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(serviceAccountString);
      console.log('[Admin SDK] Service account key file parsed successfully.');
    } catch (e: any) {
      const err = new Error(`Error parsing service account key file: ${e.message}. Ensure it's valid JSON.`);
      console.error('[Admin SDK] CRITICAL ERROR:', err.message, e);
      initializationError = err;
      adminInstance = null;
      return;
    }

    if (!serviceAccount.project_id) {
      const err = new Error("Service account key file is missing 'project_id'.");
      console.error('[Admin SDK] CRITICAL ERROR:', err.message);
      initializationError = err;
      adminInstance = null;
      return;
    }
    console.log(`[Admin SDK] Service account project_id: ${serviceAccount.project_id}`);

    let credential;
    try {
      credential = Fadmin.credential.cert(serviceAccount);
      console.log('[Admin SDK] Firebase credential object created successfully.');
    } catch (e: any) {
      const err = new Error(`Error creating Firebase credential: ${e.message}. Check service account key contents.`);
      console.error('[Admin SDK] CRITICAL ERROR:', err.message, e);
      initializationError = err;
      adminInstance = null;
      return;
    }

    console.log(`[Admin SDK] Initializing Firebase Admin app with name: ${ARIA_ADMIN_APP_NAME} for project: ${serviceAccount.project_id}`);
    adminInstance = Fadmin.initializeApp({
      credential,
      // databaseURL: `https://${serviceAccount.project_id}.firebaseio.com` // Optional if RTDB needed
      storageBucket: `${serviceAccount.project_id}.appspot.com` // Needed for storage
    }, ARIA_ADMIN_APP_NAME);

    // Verify project ID after initialization
    if (!adminInstance.options.projectId) {
      const err = new Error('Firebase Admin SDK initialized, but project ID is undefined in app options. This is unexpected.');
      console.error('[Admin SDK] CRITICAL ERROR:', err.message);
      initializationError = err;
      adminInstance = null; // Treat as failed initialization
      return;
    }

    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for named app '${ARIA_ADMIN_APP_NAME}'. Project ID: ${adminInstance.options.projectId}`);
    initializationError = null;

  } catch (error: any) {
    console.error('[Admin SDK] CRITICAL ERROR during Firebase Admin SDK initialization:', error);
    initializationError = error;
    adminInstance = null;
  }

  if (!adminInstance && !initializationError) {
    initializationError = new Error('Admin SDK initialization process completed, but adminInstance is still null and no specific error was caught. This indicates an unknown initialization failure.');
    console.error('[Admin SDK] CRITICAL ERROR:', initializationError.message);
  }
}

// Initialize on module load
initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  const initialized = !!adminInstance && !initializationError;
  if (!initialized) {
    // This log helps if an API route calls this and it's false, to reiterate the problem source
    console.warn(`[Admin SDK] isAdminInitialized() check: SDK is NOT initialized. Current state - adminInstance: ${!!adminInstance}, initializationError: ${initializationError?.message || 'None'}`);
  }
  return initialized;
}

export function getInitializationError(): string | null {
  return initializationError ? `Admin SDK Init Error: ${initializationError.message}` : null;
}

function getAdminInstanceSafe(): Fadmin.app.App {
  if (!adminInstance || initializationError) {
    console.error('[Admin SDK] Attempted to get admin instance, but it is not initialized or an error occurred.', initializationError);
    // Try to re-initialize, though this is a fallback and might not always succeed if the root cause persists
    initializeAdminAppSingleton();
    if (!adminInstance || initializationError) {
      throw new Error(`Firebase Admin SDK is not initialized or in an error state. Error: ${initializationError?.message || 'Unknown initialization error'}`);
    }
  }
  return adminInstance;
}

export function getDb(): Fadmin.firestore.Firestore {
  try {
    const instance = getAdminInstanceSafe();
    return instance.firestore();
  } catch (e: any) {
    console.error('[Admin SDK] Error getting Firestore instance:', e.message);
    if (!initializationError) {
      initializationError = new Error(`Failed to get Firestore service: ${e.message}`);
    }
    throw e; // Re-throw so the caller knows it failed
  }
}

export function getAuthAdmin(): Fadmin.auth.Auth {
   try {
    const instance = getAdminInstanceSafe();
    return instance.auth();
  } catch (e: any)
{
    console.error('[Admin SDK] Error getting Auth instance:', e.message);
    if (!initializationError) {
      initializationError = new Error(`Failed to get Auth service: ${e.message}`);
    }
    throw e;
  }
}

export function getStorageAdmin(): Fadmin.storage.Storage {
   try {
    const instance = getAdminInstanceSafe();
    return instance.storage();
  } catch (e: any)
{
    console.error('[Admin SDK] Error getting Storage instance:', e.message);
    if (!initializationError) {
      initializationError = new Error(`Failed to get Storage service: ${e.message}`);
    }
    throw e;
  }
}

// Exporting the Fadmin namespace itself as 'admin' for traditional usage like admin.firestore.Timestamp
export { Fadmin as admin };
export const FieldValue = Fadmin.firestore.FieldValue;
export const AdminTimestamp = Fadmin.firestore.Timestamp;

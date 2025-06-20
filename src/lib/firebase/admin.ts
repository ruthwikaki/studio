
// src/lib/firebase/admin.ts
import * as Fadmin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

console.log('[Admin SDK] Module loading...');

let adminInstance: Fadmin.app.App | null = null;
let initializationError: Error | null = null;

const SERVICE_ACCOUNT_FILE = 'service-account-key.json';

function initializeAdminAppSingleton(): void {
  if (adminInstance) {
    console.log('[Admin SDK] Already initialized.');
    return;
  }

  try {
    const serviceAccountPath = path.join(process.cwd(), SERVICE_ACCOUNT_FILE);
    console.log(`[Admin SDK] Looking for service account key at: ${serviceAccountPath}`);

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Service account key file not found at ${serviceAccountPath}. Ensure '${SERVICE_ACCOUNT_FILE}' is in the project root.`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log(`[Admin SDK] Service account file loaded for project: ${serviceAccount.project_id}`);

    if (Fadmin.apps.length > 0) {
      console.log('[Admin SDK] An app is already initialized. Getting default app.');
      adminInstance = Fadmin.app();
    } else {
      console.log('[Admin SDK] Initializing new Firebase Admin app...');
      adminInstance = Fadmin.initializeApp({
        credential: Fadmin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`,
      });
    }
    
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${adminInstance.options.projectId}`);
    initializationError = null;

  } catch (error: any) {
    console.error('[Admin SDK] CRITICAL ERROR during Firebase Admin SDK initialization:', error);
    initializationError = error;
    adminInstance = null;
  }
}

// Initialize on module load
initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  return !!adminInstance && !initializationError;
}

export function getInitializationError(): string | null {
  return initializationError ? `Admin SDK Init Error: ${initializationError.message}` : null;
}

function getAdminInstanceSafe(): Fadmin.app.App {
  if (!adminInstance || initializationError) {
    const finalErrorMsg = `Firebase Admin SDK is not available. Error: ${initializationError?.message || 'Unknown initialization error'}`;
    console.error(`[Admin SDK] CRITICAL HALT: ${finalErrorMsg}`);
    throw new Error(finalErrorMsg);
  }
  return adminInstance;
}

export function getDb(): Fadmin.firestore.Firestore {
  return getAdminInstanceSafe().firestore();
}

export function getAuthAdmin(): Fadmin.auth.Auth {
  return getAdminInstanceSafe().auth();
}

export function getStorageAdmin(): Fadmin.storage.Storage {
  return getAdminInstanceSafe().storage();
}

export { Fadmin as admin };
export const FieldValue = Fadmin.firestore.FieldValue;
export const AdminTimestamp = Fadmin.firestore.Timestamp;

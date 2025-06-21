// src/lib/firebase/admin.ts
import * as Fadmin from 'firebase-admin';

console.log('[Admin SDK] Module loading...');

let adminInstance: Fadmin.app.App | null = null;
let initializationError: Error | null = null;

function initializeAdminAppSingleton(): void {
  console.log('[Admin SDK] Attempting to initialize...');
  if (adminInstance) {
    console.log('[Admin SDK] Already initialized.');
    return;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    const hasEnvVars = projectId && clientEmail && privateKey;

    if (!hasEnvVars) {
      throw new Error('Missing Firebase Admin credentials. Required environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    }

    if (Fadmin.apps.length > 0) {
      console.log('[Admin SDK] An app is already initialized. Getting default app.');
      adminInstance = Fadmin.app();
    } else {
      console.log('[Admin SDK] Initializing new Firebase Admin app from environment variables...');
      adminInstance = Fadmin.initializeApp({
        credential: Fadmin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        storageBucket: `${projectId}.appspot.com`,
      });
    }
    
    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully for project: ${adminInstance!.options.projectId}`);
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
  if (initializationError) {
      return `Admin SDK Init Error: ${initializationError.message}. Check server logs for full details.`;
  }
  return null;
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
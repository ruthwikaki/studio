// src/lib/firebase/admin.ts
import * as Fadmin from 'firebase-admin';

console.log('[Admin SDK] Module loading...');

let adminInstance: Fadmin.app.App | null = null;
let initializationError: Error | null = null;

// This function is the single source of truth for initialization.
function initializeAdminAppSingleton(): void {
  // Prevent re-initialization if already successful
  if (adminInstance) {
    console.log('[Admin SDK] Initialization check: Already initialized successfully.');
    return;
  }
  
  console.log('[Admin SDK] Attempting to initialize...');

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('[Admin SDK] Reading environment variables:');
    console.log(`  - FIREBASE_PROJECT_ID: ${projectId ? `SET (Value: ${projectId})` : 'NOT SET'}`);
    console.log(`  - FIREBASE_CLIENT_EMAIL: ${clientEmail ? 'SET' : 'NOT SET'}`);
    console.log(`  - FIREBASE_PRIVATE_KEY: ${privateKey ? 'SET (First 15 chars: ' + privateKey.substring(0, 15) + '...)' : 'NOT SET'}`);

    const hasEnvVars = projectId && clientEmail && privateKey;

    if (!hasEnvVars) {
      throw new Error('CRITICAL: One or more required Firebase Admin environment variables are missing (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
    }

    // This handles the common issue of escaped newlines in .env files
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const credential = Fadmin.credential.cert({
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    });

    if (Fadmin.apps.length > 0) {
      console.log(`[Admin SDK] An app instance already exists. Reusing it.`);
      adminInstance = Fadmin.app();
    } else {
      console.log('[Admin SDK] No existing app. Initializing new Firebase Admin app.');
      adminInstance = Fadmin.initializeApp({
        credential,
        storageBucket: `${projectId}.appspot.com`,
      });
    }
    
    // eslint-disable-next-line no-console
    console.log(`${'\x1b[32m'}[Admin SDK] Firebase Admin SDK initialized successfully for project: ${adminInstance!.options.projectId}${'\x1b[0m'}`);
    initializationError = null; // Explicitly clear any previous error on success

  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(`${'\x1b[31m'}[Admin SDK] CRITICAL ERROR during Firebase Admin SDK initialization:${'\x1b[0m'}`, error);
    initializationError = error; // Capture the exact error
    adminInstance = null; // Ensure instance is null on failure
  }
}

// Initialize on module load
initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  if (initializationError) {
    // eslint-disable-next-line no-console
    console.error(`[Admin SDK Check] SDK is NOT initialized. Reason: ${initializationError.message}`);
    return false;
  }
  if (!adminInstance) {
    // eslint-disable-next-line no-console
    console.error(`[Admin SDK Check] SDK is NOT initialized. Reason: adminInstance is null and no error was recorded.`);
    return false;
  }
  return true;
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
    // eslint-disable-next-line no-console
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

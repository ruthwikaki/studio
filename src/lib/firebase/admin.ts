// src/lib/firebase/admin.ts
import * as Fadmin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

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

    if (Fadmin.apps.length > 0) {
      console.log('[Admin SDK] An app is already initialized. Getting default app.');
      adminInstance = Fadmin.app();
    } else if (hasEnvVars) {
      console.log('[Admin SDK] Initializing new Firebase Admin app from environment variables...');
      adminInstance = Fadmin.initializeApp({
        credential: Fadmin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        storageBucket: `${projectId}.appspot.com`,
      });
    } else {
      console.log('[Admin SDK] Environment variables not found. Falling back to service-account-key.json...');
      const serviceAccountPath = path.resolve(process.cwd(), 'service-account-key.json');
      if (fs.existsSync(serviceAccountPath)) {
        console.log('[Admin SDK] Initializing from service-account-key.json file...');
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        adminInstance = Fadmin.initializeApp({
          credential: Fadmin.credential.cert(serviceAccount),
          storageBucket: `${serviceAccount.project_id}.appspot.com`,
        });
      } else {
        throw new Error('Missing Firebase Admin credentials. Provide them either via FIREBASE_* environment variables or a `service-account-key.json` file in the project root.');
      }
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

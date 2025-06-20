
// src/lib/firebase/admin.ts
import * as Fadmin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

console.log('[Admin SDK] Module loaded. Attempting to initialize Firebase Admin SDK using environment variables...');

let adminInstance: Fadmin.app.App | null = null;
let initializationError: Error | null = null;
const ARIA_ADMIN_APP_NAME = 'ARIA_ADMIN_APP_PRIMARY_INSTANCE';

function initializeAdminAppSingleton(): void {
  console.log(`[Admin SDK] initializeAdminAppSingleton CALLED (Robust Env Var Approach). Current apps: ${Fadmin.apps.length}`);
  if (adminInstance) {
    console.log('[Admin SDK] Admin SDK already initialized or initialization attempted.');
    return;
  }

  try {
    if (Fadmin.apps.some(app => app?.name === ARIA_ADMIN_APP_NAME)) {
      adminInstance = Fadmin.app(ARIA_ADMIN_APP_NAME);
      console.log(`[Admin SDK] Re-using existing Firebase Admin app instance: ${ARIA_ADMIN_APP_NAME}`);
      initializationError = null;
      return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      const missingVars = [
        !projectId && "FIREBASE_PROJECT_ID",
        !clientEmail && "FIREBASE_CLIENT_EMAIL",
        !privateKey && "FIREBASE_PRIVATE_KEY"
      ].filter(Boolean).join(", ");
      const err = new Error(`Missing required Firebase Admin environment variables: ${missingVars}. Ensure they are set in your .env or .env.local file.`);
      console.error('[Admin SDK] CRITICAL ERROR:', err.message);
      initializationError = err;
      adminInstance = null;
      return;
    }
    console.log(`[Admin SDK] Using Project ID from env: ${projectId}`);

    // The private key needs to have its newline characters correctly interpreted.
    // Environment variables might escape them, so we replace \\n with \n.
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const serviceAccount = {
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    } as Fadmin.ServiceAccount;

    let credential;
    try {
      credential = Fadmin.credential.cert(serviceAccount);
      console.log('[Admin SDK] Firebase credential object created successfully from env vars.');
    } catch (e: any) {
      const err = new Error(`Error creating Firebase credential from env vars: ${e.message}. Check environment variable content and format, especially FIREBASE_PRIVATE_KEY.`);
      console.error('[Admin SDK] CRITICAL ERROR:', err.message, e);
      initializationError = err;
      adminInstance = null;
      return;
    }

    console.log(`[Admin SDK] Initializing Firebase Admin app with name: ${ARIA_ADMIN_APP_NAME} for project: ${projectId}`);
    adminInstance = Fadmin.initializeApp({
      credential,
      storageBucket: `${projectId}.appspot.com`
    }, ARIA_ADMIN_APP_NAME);

    if (!adminInstance.options.projectId) {
      const err = new Error('Firebase Admin SDK initialized, but project ID is undefined in app options. This is unexpected.');
      console.error('[Admin SDK] CRITICAL ERROR:', err.message);
      initializationError = err;
      adminInstance = null;
      return;
    }

    console.log(`[Admin SDK] Firebase Admin SDK initialized successfully using environment variables for named app '${ARIA_ADMIN_APP_NAME}'. Project ID: ${adminInstance.options.projectId}`);
    initializationError = null;

  } catch (error: any) {
    console.error('[Admin SDK] CRITICAL ERROR during Firebase Admin SDK initialization with env vars:', error);
    initializationError = error;
    adminInstance = null;
  }

  if (!adminInstance && !initializationError) {
    initializationError = new Error('Admin SDK initialization process completed, but adminInstance is still null and no specific error was caught. This indicates an unknown initialization failure with env vars.');
    console.error('[Admin SDK] CRITICAL ERROR:', initializationError.message);
  }
}

initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  const initialized = !!adminInstance && !initializationError;
  if (!initialized) {
    console.warn(`[Admin SDK] isAdminInitialized() check: SDK is NOT initialized. Current state - adminInstance: ${!!adminInstance}, initializationError: ${initializationError?.message || 'None'}`);
  }
  return initialized;
}

export function getInitializationError(): string | null {
  return initializationError ? `Admin SDK Init Error: ${initializationError.message}` : null;
}

function getAdminInstanceSafe(): Fadmin.app.App {
  if (!adminInstance || initializationError) {
    console.warn('[Admin SDK] Attempted to get admin instance, but it is not initialized or an error occurred. Trying to re-initialize.', initializationError);
    initializeAdminAppSingleton();
    if (!adminInstance || initializationError) {
      console.error(`[Admin SDK] Re-initialization failed. Throwing error. Error: ${initializationError?.message || 'Unknown initialization error'}`);
      throw new Error(`Firebase Admin SDK is not initialized or in an error state. Error: ${initializationError?.message || 'Unknown initialization error'}`);
    }
    console.log('[Admin SDK] Re-initialization successful during getAdminInstanceSafe.');
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
    throw e;
  }
}

export function getAuthAdmin(): Fadmin.auth.Auth {
   try {
    const instance = getAdminInstanceSafe();
    return instance.auth();
  } catch (e: any) {
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
  } catch (e: any) {
    console.error('[Admin SDK] Error getting Storage instance:', e.message);
    if (!initializationError) {
      initializationError = new Error(`Failed to get Storage service: ${e.message}`);
    }
    throw e;
  }
}

export { Fadmin as admin };
export const FieldValue = Fadmin.firestore.FieldValue;
export const AdminTimestamp = Fadmin.firestore.Timestamp;

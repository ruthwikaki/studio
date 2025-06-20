
// src/lib/firebase/admin.ts
// Firebase Admin SDK - Temporarily STUBBED OUT to isolate Next.js routing issues.
// This version will not initialize Firebase Admin but will provide the expected function signatures.

console.log("%c[Admin SDK STUB] Module loaded. Firebase Admin functionality is TEMPORARILY STUBBED for routing diagnosis.", "color: orange; font-weight: bold;");

let isInitializedStub = false; // Simulate not initialized
let initializationErrorStub: Error | null = new Error(
  "Firebase Admin SDK initialization is currently STUBBED for testing Next.js routing. This is not a real Firebase error unless routing is confirmed to work."
);

export function initializeAdminAppSingleton(): void {
  console.warn("[Admin SDK STUB] initializeAdminAppSingleton called. Doing nothing (stubbed).");
  // To simulate success for testing API logic later (after routing is fixed):
  // isInitializedStub = true;
  // initializationErrorStub = null;
}

// Call it once to mimic the original structure
initializeAdminAppSingleton();

export function isAdminInitialized(): boolean {
  console.warn(`[Admin SDK STUB] isAdminInitialized called. Returning: ${isInitializedStub}`);
  return isInitializedStub;
}

export function getInitializationError(): string | null {
  console.warn("[Admin SDK STUB] getInitializationError called.");
  return initializationErrorStub ? `STUBBED ERROR: ${initializationErrorStub.message}` : null;
}

export function getDb() {
  console.error("[Admin SDK STUB] getDb() called. Firebase Admin is STUBBED. Returning null. THIS WILL CAUSE ERRORS IF USED.");
  if (!isInitializedStub) console.error("Attempted to get DB when Admin SDK stub is not 'initialized'.");
  return null;
}

export function getAuthAdmin() {
  console.error("[Admin SDK STUB] getAuthAdmin() called. Firebase Admin is STUBBED. Returning null. THIS WILL CAUSE ERRORS IF USED.");
  if (!isInitializedStub) console.error("Attempted to get Auth when Admin SDK stub is not 'initialized'.");
  return null;
}

export function getStorageAdmin() {
  console.error("[Admin SDK STUB] getStorageAdmin() called. Firebase Admin is STUBBED. Returning null. THIS WILL CAUSE ERRORS IF USED.");
  if (!isInitializedStub) console.error("Attempted to get Storage when Admin SDK stub is not 'initialized'.");
  return null;
}

// Stub out Firebase Admin exports to prevent import errors in other files
// These will not be functional but will allow the app to compile.
const FadminStub = {
  firestore: {
    Timestamp: {
      now: () => {
        console.warn("[Admin SDK STUB] Fadmin.firestore.Timestamp.now() called.");
        return new Date(); // Return a JS Date
      },
      fromDate: (date: Date) => {
        console.warn("[Admin SDK STUB] Fadmin.firestore.Timestamp.fromDate() called.");
        return date; // Return a JS Date
      },
    },
    FieldValue: {
      serverTimestamp: () => {
        console.warn("[Admin SDK STUB] Fadmin.firestore.FieldValue.serverTimestamp() called.");
        return new Date();
      },
      arrayUnion: (...args: any[]) => {
        console.warn("[Admin SDK STUB] Fadmin.firestore.FieldValue.arrayUnion() called.");
        return args;
      },
      increment: (val: number) => {
        console.warn("[Admin SDK STUB] Fadmin.firestore.FieldValue.increment() called.");
        return val;
      }
    }
  },
  app: (name?: string) => {
    console.warn(`[Admin SDK STUB] Fadmin.app(${name || ''}) called.`);
    return { // Return a minimal stub of the App object
      name: name || '[DEFAULT_STUB]',
      options: { projectId: 'stubbed-project-id' },
      firestore: () => getDb(), // Link to our stubbed getDb
      auth: () => getAuthAdmin(),
      storage: () => getStorageAdmin(),
    };
  },
  credential: { // Stub Fadmin.credential
    cert: (sa: any) => {
      console.warn("[Admin SDK STUB] Fadmin.credential.cert() called.");
      return { type: 'stubbed_credential' } as any; // Return a stub
    }
  },
  initializeApp: (options: any, name?: string) => {
    console.warn(`[Admin SDK STUB] Fadmin.initializeApp(${name || ''}) called. Doing nothing (stubbed).`);
    // Simulate a successful initialization for the stub's internal logic if needed
    // isInitializedStub = true;
    // initializationErrorStub = null;
    return FadminStub.app(name); // Return the stubbed app
  },
  apps: [] as any[], // Stub Fadmin.apps
};

export { FadminStub as admin, FadminStub as Fadmin }; // Export the stub as `admin` and `Fadmin`
export const FieldValue = FadminStub.firestore.FieldValue;
export const AdminTimestamp = FadminStub.firestore.Timestamp;

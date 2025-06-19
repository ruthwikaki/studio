// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import * as path from 'path'; // Import the 'path' module

// Construct an absolute path to 'service-account-key.json' in the project root
// __dirname will be src/lib/firebase, so ../../.. goes up to the project root
const serviceAccountPath = path.resolve(__dirname, '../../../service-account-key.json');

try {
  if (!admin.apps.length) {
    // Check if the service account key file actually exists before trying to require it
    // This provides a more targeted error message.
    // Note: fs.existsSync would be ideal but adds another dependency if not already used.
    // For now, relying on the require error.
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    console.log("Firebase Admin SDK initialized in admin.ts, using key from project root.");
  }
} catch (error: any) {
  console.error("CRITICAL ERROR initializing Firebase Admin SDK in admin.ts:");
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(path.basename(serviceAccountPath))) {
    console.error(`  Reason: The '${path.basename(serviceAccountPath)}' file was not found.`);
    console.error(`  Expected at: ${serviceAccountPath}`);
    console.error("  ACTION: Please download your service account key from your Firebase project settings, name it 'service-account-key.json', and place it in the project root directory.");
  } else if (error.message.includes("Failed to parse service account KeyFile") || (error.message.includes("Credential implementation provided to initializeApp()") && error.message.includes("failed to fetch a Project ID"))) {
     console.error("  Reason: The 'service-account-key.json' file seems to be invalid or incomplete (e.g., missing 'project_id', not valid JSON).");
     console.error("  ACTION: Please re-download your service account key from Firebase and ensure it's correctly placed in the project root and not corrupted.");
  } else {
    console.error("  Reason:", error.message);
    console.error("  ACTION: Verify your 'service-account-key.json' is correct and in the project root.");
  }
  console.error("--------------------------------------------------------------------");
  // Optionally re-throw or exit if initialization is critical for server startup
  // throw error;
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
export const storageAdmin = admin.storage();
export const FieldValue = admin.firestore.FieldValue;
export const AdminTimestamp = admin.firestore.Timestamp;
export type { Timestamp as AdminTimestampType } from 'firebase-admin/firestore';
export { admin }; // Export the admin namespace itself

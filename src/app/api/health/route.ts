
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminInitialized, getDb, getInitializationError, admin } from '@/lib/firebase/admin';

// THIS LOG IS CRITICAL FOR DIAGNOSIS: If it doesn't appear on server start/request, Next.js isn't loading this file.
console.log('[API /api/health/route.ts] File loaded and parsed by Next.js/Node.');

export const dynamic = 'force-dynamic'; // Ensures the route is always re-evaluated

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request handler invoked.');
  let firestoreStatus = 'not_checked';
  let firestoreError = null;
  let sdkInitializationError = null;
  let adminSDKIsInitialized = false;
  let adminSDKInitializationDetails = "Not determined";

  if (isAdminInitialized()) {
    adminSDKIsInitialized = true;
    adminSDKInitializationDetails = "Admin SDK reported as initialized by isAdminInitialized().";
    console.log('[API /api/health] Admin SDK reported as initialized.');
    const db = getDb();
    if (db) {
      try {
        console.log('[API /api/health] Attempting Firestore read operation...');
        // Perform a simple read operation, e.g., get a document or list collections
        await db.collection('_health_check_api_route').limit(1).get();
        firestoreStatus = 'reachable';
        console.log('[API /api/health] Firestore check successful via API route.');
      } catch (e: any) {
        firestoreStatus = 'unreachable';
        firestoreError = e.message;
        console.error('[API /api/health] Firestore check via API route FAILED:', e.message);
      }
    } else {
      firestoreStatus = 'db_instance_null_in_api';
      firestoreError = 'Firestore instance (db) is null from getDb() in API route, even though Admin SDK reported as initialized.';
      adminSDKInitializationDetails = `Admin SDK reported as initialized, but getDb() returned null. ${getInitializationError() || ''}`;
      console.error(`[API /api/health] Firestore instance is null in API route. Admin SDK init error was: ${getInitializationError()}`);
    }
  } else {
    firestoreStatus = 'admin_sdk_not_initialized_in_api';
    sdkInitializationError = getInitializationError();
    adminSDKInitializationDetails = `Admin SDK reported as NOT initialized by isAdminInitialized(). Error: ${sdkInitializationError}`;
    firestoreError = `Firebase Admin SDK not initialized when API route was called. Init Error: ${sdkInitializationError}`;
    console.error(`[API /api/health] Firebase Admin SDK not initialized in API route. Init Error: ${sdkInitializationError}`);
  }

  const responsePayload = {
    status: 'ok',
    message: 'Health check endpoint reached successfully.',
    timestamp: new Date().toISOString(),
    adminSDK: {
      isInitialized: adminSDKIsInitialized,
      details: adminSDKInitializationDetails,
      reportedError: sdkInitializationError,
    },
    firestore: {
      status: firestoreStatus,
      error: firestoreError,
    },
    nextJsVersion: process.versions.node, // Shows Node version used by Next.js
  };
  console.log('[API /api/health] Sending success response:', JSON.stringify(responsePayload));
  return NextResponse.json(responsePayload);
}

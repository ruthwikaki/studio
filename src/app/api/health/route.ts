
// src/app/api/health/route.ts
console.log('[API /api/health/route.ts] File loaded by Next.js runtime.');

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminInitialized, getDb, getInitializationError, admin } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request handler invoked.');
  let adminSDKIsInitialized = false;
  let sdkInitializationDetails = "Not determined";
  let firestoreStatus = 'not_checked';
  let firestoreErrorDetails = null;

  if (isAdminInitialized()) {
    adminSDKIsInitialized = true;
    sdkInitializationDetails = "Admin SDK reported as initialized by isAdminInitialized().";
    console.log('[API /api/health] Admin SDK reported as initialized by route handler.');
    const db = getDb();
    if (db) {
      try {
        console.log('[API /api/health] Attempting Firestore read operation...');
        await db.collection('_health_check_api_route').limit(1).get();
        firestoreStatus = 'reachable';
        console.log('[API /api/health] Firestore check successful via API route.');
      } catch (e: any) {
        firestoreStatus = 'unreachable';
        firestoreErrorDetails = e.message;
        console.error('[API /api/health] Firestore check via API route FAILED:', e.message);
      }
    } else {
      firestoreStatus = 'db_instance_null_in_api';
      firestoreErrorDetails = 'Firestore instance (db) is null from getDb() in API route, even though Admin SDK reported as initialized.';
      sdkInitializationDetails = `Admin SDK reported as initialized, but getDb() returned null. Potential internal issue in admin.ts or service access. Error from getInitializationError(): ${getInitializationError() || 'None'}`;
      console.error(`[API /api/health] Firestore instance is null in API route. Admin SDK init error (if any) was: ${getInitializationError()}`);
    }
  } else {
    firestoreStatus = 'admin_sdk_not_initialized_in_api';
    const specificError = getInitializationError();
    sdkInitializationDetails = `Admin SDK reported as NOT initialized by isAdminInitialized(). Error: ${specificError || 'No specific error message captured by getInitializationError(). Check startup logs.'}`;
    firestoreErrorDetails = `Firebase Admin SDK not initialized when API route was called. Specific Init Error: ${specificError || 'No specific error message. Check startup logs for admin.ts CRITICAL ERRORS.'}`;
    console.error(`[API /api/health] Firebase Admin SDK not initialized in API route. Specific Init Error: ${specificError}`);
  }

  const responsePayload = {
    status: 'ok',
    message: 'Health check from /api/health GET handler.',
    timestamp: new Date().toISOString(),
    adminSDK: {
      isInitialized: adminSDKIsInitialized,
      details: sdkInitializationDetails,
    },
    firestore: {
      status: firestoreStatus,
      error: firestoreErrorDetails,
    },
    nextJsVersion: process.versions.node,
  };
  console.log('[API /api/health] Sending success response:', JSON.stringify(responsePayload));
  return NextResponse.json(responsePayload);
}

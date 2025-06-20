
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminInitialized, getDb, getInitializationError } from '@/lib/firebase/admin';

console.log('[API /api/health/route.ts] File loaded and parsed by Next.js/Node.');

export const dynamic = 'force-dynamic'; // Ensures the route is always re-evaluated

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request handler invoked.');
  let firestoreStatus = 'not_checked';
  let firestoreError = null;
  let adminSDKInitializationError = null;

  if (isAdminInitialized()) {
    console.log('[API /api/health] Admin SDK reported as initialized.');
    const db = getDb();
    if (db) {
      try {
        console.log('[API /api/health] Attempting Firestore read operation...');
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
      console.error('[API /api/health] Firestore instance is null in API route.');
    }
  } else {
    firestoreStatus = 'admin_sdk_not_initialized_in_api';
    adminSDKInitializationError = getInitializationError();
    firestoreError = `Firebase Admin SDK not initialized when API route was called. Error: ${adminSDKInitializationError}`;
    console.error(`[API /api/health] Firebase Admin SDK not initialized in API route. Error: ${adminSDKInitializationError}`);
  }

  try {
    const responsePayload = {
      status: 'ok',
      message: 'API is healthy and responding.',
      timestamp: new Date().toISOString(),
      firestoreStatus: firestoreStatus,
      firestoreError: firestoreError,
      adminSDKInitializationError: adminSDKInitializationError,
      nextJsVersion: process.versions.node, 
    };
    console.log('[API /api/health] Sending success response:', JSON.stringify(responsePayload));
    return NextResponse.json(responsePayload);
  } catch (e: any) {
    console.error('[API /api/health] Error in health check handler itself:', e);
    return NextResponse.json(
      { status: 'error', message: e.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

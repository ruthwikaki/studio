
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminInitialized, getDb } from '@/lib/firebase/admin';

console.log('[API /api/health/route.ts] File loaded and parsed by Next.js/Node.');

export const dynamic = 'force-dynamic'; // Ensures the route is always re-evaluated

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request handler invoked.');
  let firestoreStatus = 'not_checked';
  let firestoreError = null;

  if (isAdminInitialized()) {
    const db = getDb();
    if (db) {
      try {
        // Perform a simple read operation
        await db.collection('_health_check').limit(1).get();
        firestoreStatus = 'reachable';
        console.log('[API /api/health] Firestore check successful.');
      } catch (e: any) {
        firestoreStatus = 'unreachable';
        firestoreError = e.message;
        console.error('[API /api/health] Firestore check failed:', e.message);
      }
    } else {
      firestoreStatus = 'db_instance_null';
      firestoreError = 'Firestore instance (db) is null even after Admin SDK initialization.';
      console.error('[API /api/health] Firestore instance is null.');
    }
  } else {
    firestoreStatus = 'admin_sdk_not_initialized';
    firestoreError = 'Firebase Admin SDK not initialized. Check service-account-key.json and server logs.';
    console.error('[API /api/health] Firebase Admin SDK not initialized.');
  }

  try {
    const responsePayload = {
      status: 'ok',
      message: 'API is healthy and responding.',
      timestamp: new Date().toISOString(),
      firestoreStatus: firestoreStatus,
      firestoreError: firestoreError, // Include Firestore error if any
      nextJsVersion: process.versions.node, // Example of adding more info
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

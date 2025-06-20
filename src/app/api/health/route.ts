
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminInitialized, getDb, getInitializationError } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request handler invoked.');
  
  const isSDKInitialized = isAdminInitialized();
  let firestoreStatus = 'not_checked';
  let firestoreError = null;

  if (isSDKInitialized) {
    try {
      const db = getDb();
      // Perform a simple read to confirm connectivity
      await db.collection('_internal_health_check').limit(1).get();
      firestoreStatus = 'reachable';
      console.log('[API /api/health] Firestore check: Reachable.');
    } catch (error: any) {
      console.error('[API /api/health] Firestore check failed:', error);
      firestoreStatus = 'unreachable';
      firestoreError = error.message;
    }
  } else {
    firestoreStatus = 'sdk_not_initialized';
    console.warn('[API /api/health] Admin SDK not initialized, skipping Firestore check.');
  }

  const responsePayload = {
    status: 'ok',
    message: 'API health check successful.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    adminSDK: {
      isInitialized: isSDKInitialized,
      reportedError: getInitializationError(),
    },
    firestore: {
      status: firestoreStatus,
      error: firestoreError,
    },
  };
  
  console.log('[API /api/health] Sending success response.');
  return NextResponse.json(responsePayload);
}

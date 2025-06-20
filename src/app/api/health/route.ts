// src/app/api/health/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb, AdminTimestamp, isAdminInitialized } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  console.log('[Health Check] API endpoint hit.');

  if (!isAdminInitialized()) {
    console.error('[Health Check API] Firebase Admin SDK not initialized. Check server logs for details, especially regarding service-account-key.json.');
    return NextResponse.json({
        status: 'error',
        message: 'Service is unhealthy. Firebase Admin SDK failed to initialize. Please verify "service-account-key.json" in project root and check server logs for detailed errors.',
        timestamp: new Date().toISOString(),
        firestoreReachable: false,
    }, { status: 503 });
  }

  const db = getDb();

  if (!db) {
    console.error('[Health Check API] Firestore instance (db) is null even though SDK reported as initialized. This is unexpected.');
     return NextResponse.json({
        status: 'error',
        message: 'Service is unhealthy. Firestore instance is unexpectedly null after SDK initialization. Check server logs.',
        timestamp: new Date().toISOString(),
        firestoreReachable: false,
    }, { status: 503 });
  }

  try {
    // console.log('[Health Check API] Admin SDK initialized. Attempting to read from Firestore...');
    // Using a non-existent document ID in a non-critical collection or a dedicated health check doc
    const healthCheckDocRef = db.collection('_health_checks').doc('status');
    const docSnap = await healthCheckDocRef.get(); // Perform a read to ensure connectivity

    // The actual existence of the doc doesn't matter as much as the query succeeding.
    console.log(`[Health Check API] Firestore read attempt successful. Document exists: ${docSnap.exists}`);
    
    return NextResponse.json({ 
        status: 'ok', 
        message: 'Service is healthy. Firebase Admin SDK initialized and Firestore connection appears to be working.',
        timestamp: AdminTimestamp.now().toDate().toISOString(),
        firestoreReachable: true,
    });
  } catch (error: any) {
    console.error('[Health Check API] Health check failed during Firestore operation:', error);
    return NextResponse.json({ 
        status: 'error', 
        message: 'Service is unhealthy. Error during Firestore health check operation.',
        errorDetails: error.message || 'Unknown Firestore operation error.',
        timestamp: new Date().toISOString(),
        firestoreReachable: false, // Explicitly false as the operation failed
    }, { status: 503 });
  }
}

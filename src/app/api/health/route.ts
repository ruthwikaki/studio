
// src/app/api/health/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Attempt a simple read from Firestore to check connectivity
    // Using a non-existent document ID in a non-critical collection or a dedicated health check doc
    console.log('[Health Check] Attempting to connect to Firestore...');
    const healthCheckDoc = await db.collection('_health_checks').doc('status').get();
    // The actual existence of the doc doesn't matter as much as the query succeeding.
    
    console.log('[Health Check] Firestore connection successful.');
    return NextResponse.json({ 
        status: 'ok', 
        message: 'Service is healthy. Firestore connection appears to be working.',
        timestamp: AdminTimestamp.now().toDate().toISOString(),
        firestoreReachable: true,
    });
  } catch (error: any) {
    console.error('[Health Check] Health check failed:', error);
    let errorMessage = error.message || 'Unknown error during health check.';
    let firestoreReachable = false;

    if (error.message && error.message.includes('Failed to detect project ID')) {
        errorMessage = "Failed to detect Firebase project ID. This often means the Firebase Admin SDK is not initialized correctly. Please ensure your 'service-account-key.json' is valid and correctly placed in the project root.";
    } else if (error.message && (error.message.includes("Could not load the default credentials") || error.message.includes("Unable to detect a Project ID"))) {
        errorMessage = "Firebase Admin SDK could not load credentials or detect Project ID. Check 'service-account-key.json'.";
    }


    return NextResponse.json({ 
        status: 'error', 
        message: 'Service is unhealthy.',
        errorDetails: errorMessage,
        timestamp: AdminTimestamp.now().toDate().toISOString(),
        firestoreReachable: firestoreReachable,
    }, { status: 503 }); // 503 Service Unavailable
  }
}


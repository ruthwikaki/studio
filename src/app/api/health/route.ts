
// src/app/api/health/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db, AdminTimestamp } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Attempt a simple read from Firestore to check connectivity
    // Using a non-existent document ID in a non-critical collection or a dedicated health check doc
    const healthCheckDoc = await db.collection('_health_checks').doc('status').get();
    // The actual existence of the doc doesn't matter as much as the query succeeding.
    
    return NextResponse.json({ 
        status: 'ok', 
        message: 'Service is healthy.',
        timestamp: AdminTimestamp.now().toDate().toISOString(),
        firestoreReachable: true,
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return NextResponse.json({ 
        status: 'error', 
        message: 'Service is unhealthy.',
        errorDetails: error.message,
        timestamp: AdminTimestamp.now().toDate().toISOString(),
        firestoreReachable: false,
    }, { status: 503 }); // 503 Service Unavailable
  }
}

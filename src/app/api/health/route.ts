// src/app/api/health/route.ts
console.log('[API /api/health/route.ts] File loaded by Next.js runtime.');

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminInitialized, getDb, getInitializationError, admin } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request handler invoked.');
  
  const responsePayload = {
    status: 'ok',
    message: 'Health check successful from /api/health GET handler.',
    timestamp: new Date().toISOString(),
    adminSDK: {
      isInitialized: false,
      reportedError: "Not checked in this basic test.",
    },
    firestore: {
      status: 'not_checked_in_basic_test',
    },
  };
  console.log('[API /api/health] Sending basic success response:', JSON.stringify(responsePayload));
  return NextResponse.json(responsePayload);
}

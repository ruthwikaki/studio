
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

console.log('[API /api/health/route.ts] File loaded by Next.js runtime. This is a critical diagnostic log.');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request handler invoked.');
  try {
    // Removed Firebase Admin SDK interaction for initial test
    const responsePayload = {
      status: 'ok_minimal_health_check',
      message: 'Minimal health check successful from /api/health GET handler.',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    };
    console.log('[API /api/health] Sending success response:', JSON.stringify(responsePayload));
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('[API /api/health] Error in GET handler:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}

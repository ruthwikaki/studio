
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

console.log('[API /api/ping/route.ts] File loaded by Next.js runtime.');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('[API /api/ping] GET request handler invoked.');
  try {
    const responsePayload = {
      message: 'pong_from_ping_route',
      timestamp: new Date().toISOString(),
    };
    console.log('[API /api/ping] Sending success response:', JSON.stringify(responsePayload));
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('[API /api/ping] Error in GET handler:', error);
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}

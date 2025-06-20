// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[API /api/health] GET request received by handler.');
  try {
    return NextResponse.json({
      status: 'ok',
      message: 'API is healthy and responding.',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[API /api/health] Error in health check handler:', e);
    return NextResponse.json({ status: 'error', message: e.message }, { status: 500 });
  }
}

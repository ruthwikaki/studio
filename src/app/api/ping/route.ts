// src/app/api/ping/route.ts
console.log('[API /api/ping/route.ts] File loaded by Next.js runtime.');

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('[API /api/ping] GET request handler invoked.');
  
  const responsePayload = {
    message: 'pong',
    timestamp: new Date().toISOString(),
  };
  console.log('[API /api/ping] Sending success response:', JSON.stringify(responsePayload));
  return NextResponse.json(responsePayload);
}

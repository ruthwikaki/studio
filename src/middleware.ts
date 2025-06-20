
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs'; // Force Node.js runtime instead of edge

console.log('[Middleware] Module loaded.');

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Middleware] Request to: ${pathname}, Method: ${request.method}`);

  // This middleware now only runs for API routes due to the matcher config below.
  // The 'withAuth' HOC on each API route will handle the actual token verification.
  // This middleware's primary job is now simplified to logging and passing through.

  if (request.method === 'OPTIONS') {
    console.log(`[Middleware] Handling OPTIONS preflight for: ${pathname}`);
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Pass through the request to be handled by the route handler.
  const response = NextResponse.next();
  // Set CORS header for all API responses
  response.headers.set('Access-Control-Allow-Origin', '*');
  
  return response;
}

export const config = {
  // Apply middleware only to API routes
  matcher: '/api/:path*',
};

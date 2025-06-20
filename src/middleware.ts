
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

console.log('[Middleware] File loaded by Next.js.');

export function middleware(request: NextRequest) {
  const { pathname, method } = request;
  console.log(`[Middleware] Request received for: ${method} ${pathname}`);

  // Check if the request is for an API route
  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Processing API request: ${method} ${pathname}`);

    // Handle OPTIONS pre-flight requests
    if (method === 'OPTIONS') {
      console.log(`[Middleware] Handling OPTIONS preflight for API route: ${pathname}`);
      const response = new NextResponse(null, { status: 204 }); // No Content for OPTIONS
      response.headers.set('Access-Control-Allow-Origin', '*'); // Be more specific in production
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 1 day
      return response;
    }

    // For actual API requests, allow them to proceed to the Next.js router
    // and add basic CORS headers to the actual response.
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*'); // Be more specific in production
    console.log(`[Middleware] Passing through API request for: ${pathname} to Next.js handler.`);
    return response;
  }

  // For non-API routes, just pass through without modification
  console.log(`[Middleware] Passing through non-API request: ${pathname}`);
  return NextResponse.next();
}

// Matcher ensures this middleware only runs for API routes
export const config = {
  matcher: ['/api/:path*'],
};

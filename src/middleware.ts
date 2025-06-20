
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, method } = request;
  console.log(`[Middleware] Path: ${pathname}, Method: ${method}`);

  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Processing API request: ${method} ${pathname}`);

    if (method === 'OPTIONS') {
      console.log(`[Middleware] Handling OPTIONS preflight for API route: ${pathname}`);
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
      return response;
    }
    
    const response = NextResponse.next();
    // Add basic CORS headers for actual API responses during development
    response.headers.set('Access-Control-Allow-Origin', '*');
    console.log(`[Middleware] Passing through API request for: ${pathname} to Next.js handler.`);
    return response;
  }

  // For non-API routes, just pass through
  console.log(`[Middleware] Passing through non-API request: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  // Apply middleware only to API routes to be explicit, or to all if you have other global needs.
  // For now, focusing on API routes.
  matcher: ['/api/:path*'], 
};

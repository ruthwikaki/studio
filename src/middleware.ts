
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { method } = request;

  console.log(`[Middleware] Path: ${pathname}, Method: ${method}`);

  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Processing API request: ${method} ${pathname}`);

    if (method === 'OPTIONS') {
      console.log(`[Middleware] Handling OPTIONS preflight for API route: ${pathname}`);
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', '*'); // Allow all origins for dev
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 1 day
      return response;
    }
    
    console.log(`[Middleware] Passing through API request for: ${pathname} to Next.js handler.`);
    // For actual API requests, add CORS headers to the response from the handler
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Log non-API requests being passed through
  // console.log(`[Middleware] Not an API request, passing through: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'], // Focus middleware on API routes
};

// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { method } = request;

  // Log all requests entering the middleware
  console.log(`[Middleware] Path: ${pathname}, Method: ${method}`);

  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Processing API request: ${method} ${pathname}`);

    if (method === 'OPTIONS') {
      console.log(`[Middleware] Handling OPTIONS preflight for: ${pathname}`);
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
      return response;
    }

    // For non-OPTIONS API requests, log that we are passing them through
    console.log(`[Middleware] Passing through non-OPTIONS API request for: ${pathname} to Next.js handler.`);
    const response = NextResponse.next(); // Allows the request to proceed to the API route handler
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Log non-API requests being passed through
  console.log(`[Middleware] Not an API request, passing through: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  // Temporarily widen matcher to see logs for ALL requests for debugging.
  // Revert to '/api/:path*' once resolved.
  matcher: ['/api/:path*', '/:path*'],
};

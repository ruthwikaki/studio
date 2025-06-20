
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, method } = request;
  console.log(`[Middleware] Request: ${method} ${pathname}`);

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
    
    // For other API requests, pass through to the Next.js handler
    // and let the handler (or a global config) set specific CORS if needed for non-OPTIONS
    const response = NextResponse.next();
    // It's generally better to handle CORS in Next.js config or route handlers if needed for non-OPTIONS
    // But for development, this is okay for now.
    response.headers.set('Access-Control-Allow-Origin', '*'); 
    console.log(`[Middleware] Passing through API request for: ${pathname} to Next.js handler.`);
    return response;
  }

  // For non-API routes, just pass through
  // console.log(`[Middleware] Not an API request, passing through: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'], // Apply middleware only to API routes
};

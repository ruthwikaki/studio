
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { method } = request;

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

    console.log(`[Middleware] Passing through API request for: ${pathname} to Next.js handler.`);
    const response = NextResponse.next();
    // Add CORS headers for actual API responses too
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
  // Matcher specifically for API routes, and other paths if necessary.
  // If your frontend assets (CSS, JS, images) are served from root or specific folders,
  // ensure they are NOT caught by a too-greedy API matcher if you restrict this further.
  // For now, let's assume other paths are handled correctly.
  matcher: ['/api/:path*'], // Focus middleware on API routes for now
};

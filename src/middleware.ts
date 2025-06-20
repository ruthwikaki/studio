
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, method } = request;
  console.log(`[Simplified Middleware] Request to: ${pathname}, Method: ${method}`);

  if (pathname.startsWith('/api/')) {
    if (method === 'OPTIONS') {
      console.log(`[Simplified Middleware] Handling OPTIONS preflight for API route: ${pathname}`);
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
      return response;
    }
    console.log(`[Simplified Middleware] Allowing API request to proceed: ${pathname}`);
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*'); // Basic CORS for API responses
    return response;
  }

  console.log(`[Simplified Middleware] Allowing non-API request to proceed: ${pathname}`);
  return NextResponse.next();
}

// Match only API routes for now to be less intrusive
export const config = {
  matcher: '/api/:path*',
};

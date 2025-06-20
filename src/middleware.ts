
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken, VerifiedUser } from '@/lib/firebase/admin-auth'; // Assuming verifyAuthToken can handle mock/dev

console.log('[Middleware] Module loaded.');

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { method } = request;

  console.log(`[Middleware] Request to: ${pathname}, Method: ${method}`);

  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] Processing API request: ${method} ${pathname}`);

    if (method === 'OPTIONS') {
      console.log(`[Middleware] Handling OPTIONS preflight for API route: ${pathname}`);
      const response = new NextResponse(null, { status: 204 }); // No Content for preflight
      response.headers.set('Access-Control-Allow-Origin', '*'); // Be more specific in production
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 1 day
      return response;
    }

    // For actual API requests, perform authentication
    // /api/health and /api/ping can be public or have lighter checks if needed
    if (pathname === '/api/health' || pathname === '/api/ping' || pathname === '/api/auth/register') {
        console.log(`[Middleware] Allowing public access to ${pathname}`);
        const response = NextResponse.next();
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
    }
    
    try {
      console.log(`[Middleware] Attempting to verify auth token for: ${pathname}`);
      const user: VerifiedUser = await verifyAuthToken(request); // verifyAuthToken uses mock in dev if no token
      console.log(`[Middleware] Auth token verified for user: ${user.uid}, company: ${user.companyId}, role: ${user.role}. Proceeding for ${pathname}`);
      
      // Add user info to request headers for API routes to access if needed
      // This is one way to pass user context to your API handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-verified-user-uid', user.uid);
      requestHeaders.set('x-verified-user-companyid', user.companyId);
      requestHeaders.set('x-verified-user-role', user.role);
      if(user.email) requestHeaders.set('x-verified-user-email', user.email);


      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      response.headers.set('Access-Control-Allow-Origin', '*'); // Basic CORS for API responses
      return response;

    } catch (error: any) {
      console.error(`[Middleware] Authentication failed for ${pathname}:`, error.message);
      const response = NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 401 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }
  }

  // For non-API routes, just pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, register, forgot-password pages (if you have them and they should be public)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|register|forgot-password).*)',
  ],
};


// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken, VerifiedUser } from '@/lib/firebase/admin-auth';

export const runtime = 'nodejs'; // Force Node.js runtime instead of edge

console.log('[Middleware] Module loaded.');

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  console.log(`[Middleware] API request to: ${pathname}, Method: ${request.method}`);

  // This middleware now only runs for API routes due to the matcher config below.

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

  // Public API routes that don't require authentication
  const publicApiRoutes = ['/api/health', '/api/ping', '/api/auth/register'];
  if (publicApiRoutes.includes(pathname)) {
    console.log(`[Middleware] Allowing public access to ${pathname}`);
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
  
  try {
    console.log(`[Middleware] Verifying auth token for protected route: ${pathname}`);
    const user: VerifiedUser = await verifyAuthToken(request);
    console.log(`[Middleware] Auth successful for user: ${user.uid}. Proceeding...`);
    
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-verified-user-uid', user.uid);
    requestHeaders.set('x-verified-user-companyid', user.companyId);
    requestHeaders.set('x-verified-user-role', user.role);
    if (user.email) requestHeaders.set('x-verified-user-email', user.email);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;

  } catch (error: any) {
    console.error(`[Middleware] Auth failed for ${pathname}:`, error.message);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const config = {
  // Apply middleware only to API routes
  matcher: '/api/:path*',
};

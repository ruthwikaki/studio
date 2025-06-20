
// src/lib/firebase/admin-auth.ts
import type { NextRequest } from 'next/server';
import { authAdmin, db, AdminTimestamp } from './admin';
import type { UserDocument, UserRole, UserCacheDocument } from '@/lib/types/firestore';
import { NextResponse } from 'next/server';

const MOCK_USER_ID = 'user_owner_seed_001'; // Corresponds to seed script
const MOCK_COMPANY_ID = 'comp_seed_co_001'; // Corrected to match seed script
const MOCK_EMAIL = 'owner@seedsupply.example.com'; // Corresponds to seed script
const MOCK_ROLE: UserRole = 'owner';

// In-memory cache for user data to reduce Firestore lookups
// TODO: Consider a more robust caching solution (e.g., Redis, Memcached) for production
// or use Firestore TTL policies for cache documents if applicable.
interface CachedUserData {
  companyId: string;
  role: UserRole;
  email?: string | null;
  displayName?: string | null;
  lastFetched: number; // Timestamp of when it was fetched
}
const userCache = new Map<string, CachedUserData>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface VerifiedUser {
  uid: string;
  companyId: string;
  role: UserRole;
  email?: string | null;
  displayName?: string | null;
}

async function fetchAndCacheUserData(uid: string): Promise<VerifiedUser | null> {
  try {
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      console.warn(`User document not found in Firestore for UID: ${uid}`);
      return null;
    }
    const userData = userDocSnap.data() as UserDocument;
    const verifiedUser: VerifiedUser = {
      uid,
      companyId: userData.companyId,
      role: userData.role,
      email: userData.email,
      displayName: userData.displayName,
    };
    userCache.set(uid, { ...verifiedUser, lastFetched: Date.now() });
    return verifiedUser;
  } catch (error) {
    console.error(`Error fetching user data from Firestore for UID ${uid}:`, error);
    return null;
  }
}

async function getVerifiedUser(uid: string): Promise<VerifiedUser | null> {
  const cached = userCache.get(uid);
  if (cached && (Date.now() - cached.lastFetched < CACHE_DURATION_MS)) {
    return { uid, companyId: cached.companyId, role: cached.role, email: cached.email, displayName: cached.displayName };
  }
  return fetchAndCacheUserData(uid);
}


export async function verifyAuthToken(request: NextRequest): Promise<VerifiedUser> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split('Bearer ')[1];

  if (!token) {
    console.warn('verifyAuthToken: No token provided. Using mock user for development.');
    // Fallback to mock data ONLY for development if no token is present.
    // In production, this should throw an error or return a clear unauthenticated state.
    if (process.env.NODE_ENV === 'development') {
        const mockUser = await getVerifiedUser(MOCK_USER_ID); // Try to get mock user from DB for consistency
        if (mockUser) return mockUser;
        // Fallback if even mock user not in DB yet (e.g. before first seed)
        return { uid: MOCK_USER_ID, companyId: MOCK_COMPANY_ID, role: MOCK_ROLE, email: MOCK_EMAIL };
    }
    throw new Error('No authorization token provided.');
  }

  try {
    const decodedToken = await authAdmin.verifyIdToken(token);
    const verifiedUser = await getVerifiedUser(decodedToken.uid);
    if (!verifiedUser) {
        throw new Error(`User data not found for UID: ${decodedToken.uid}`);
    }
    return verifiedUser;
  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error.message);
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Firebase ID token has expired.');
    }
    throw new Error('Invalid or expired authorization token.');
  }
}


export async function verifyAuthTokenOnServerAction(): Promise<VerifiedUser> {
  // This function needs a way to get the ID token in server actions.
  // If using next-auth, it might come from `getServerSession`.
  // If using cookies directly, it would be read from cookies.
  // For now, it will remain a mock or simplified version.
  console.warn("verifyAuthTokenOnServerAction: Using MOCK user for development.");
    const mockUser = await getVerifiedUser(MOCK_USER_ID);
    if (mockUser) return mockUser;
    return { uid: MOCK_USER_ID, companyId: MOCK_COMPANY_ID, role: MOCK_ROLE, email: MOCK_EMAIL };
}

// Higher-order function to wrap API route handlers with authentication
export function withAuth(handler: (request: NextRequest, context: { params: any }, user: VerifiedUser) => Promise<NextResponse | Response>) {
  return async (request: NextRequest, context: { params: any }): Promise<NextResponse | Response> => {
    try {
      const user = await verifyAuthToken(request);
      return await handler(request, context, user);
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 401 });
    }
  };
}

const roleHierarchy: Record<UserRole, number> = {
  viewer: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export function requireRole(currentUserRole: UserRole, minimumRequiredRole: UserRole): boolean {
  return roleHierarchy[currentUserRole] >= roleHierarchy[minimumRequiredRole];
}

// Higher-order function for API routes that require specific roles
export function withRoleAuthorization(
  minimumRequiredRole: UserRole,
  handler: (request: NextRequest, context: { params: any }, user: VerifiedUser) => Promise<NextResponse | Response>
) {
  return withAuth(async (request, context, user) => {
    if (!requireRole(user.role, minimumRequiredRole)) {
      return NextResponse.json({ error: `Access denied. Requires ${minimumRequiredRole} role or higher.` }, { status: 403 });
    }
    return handler(request, context, user);
  });
}


// src/lib/firebase/admin-auth.ts
import type { NextRequest } from 'next/server';
import { getAuthAdmin, getDb, AdminTimestamp, isAdminInitialized } from './admin'; // Updated imports
import type { UserDocument, UserRole, UserCacheDocument } from '@/lib/types/firestore';
import { NextResponse } from 'next/server';

const MOCK_USER_ID = 'user_owner_seed_001';
const MOCK_COMPANY_ID = 'comp_seed_co_001'; // Standardized ID
const MOCK_EMAIL = 'owner@seedsupply.example.com';
const MOCK_ROLE: UserRole = 'owner';

// In-memory cache for user data
interface CachedUserData {
  companyId: string;
  role: UserRole;
  email?: string | null;
  displayName?: string | null;
  lastFetched: number;
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
  console.log(`[Admin Auth] fetchAndCacheUserData: Attempting to fetch user data for UID: ${uid}`);
  const firestoreDb = getDb(); // Use getter
  if (!firestoreDb) {
    console.error(`[Admin Auth] fetchAndCacheUserData: Firestore service is not available for UID: ${uid}. Admin SDK might not be initialized.`);
    return null;
  }

  try {
    const userDocRef = firestoreDb.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      console.warn(`[Admin Auth] fetchAndCacheUserData: User document not found in Firestore for UID: ${uid}`);
      return null;
    }
    const userData = userDocSnap.data() as UserDocument;
    if (userData.companyId !== MOCK_COMPANY_ID && uid === MOCK_USER_ID) {
        console.warn(`[Admin Auth] fetchAndCacheUserData: CRITICAL MISMATCH! Mock user ${MOCK_USER_ID} in Firestore has companyId '${userData.companyId}', but MOCK_COMPANY_ID is '${MOCK_COMPANY_ID}'. This will cause data loading issues.`);
    }
    const verifiedUser: VerifiedUser = {
      uid,
      companyId: userData.companyId,
      role: userData.role,
      email: userData.email,
      displayName: userData.displayName,
    };
    userCache.set(uid, { ...verifiedUser, lastFetched: Date.now() });
    console.log(`[Admin Auth] fetchAndCacheUserData: Successfully fetched and cached user data for UID: ${uid}, Company ID: ${userData.companyId}, Role: ${userData.role}`);
    return verifiedUser;
  } catch (error) {
    console.error(`[Admin Auth] fetchAndCacheUserData: Error fetching user data from Firestore for UID ${uid}:`, error);
    return null;
  }
}

async function getVerifiedUser(uid: string): Promise<VerifiedUser | null> {
  const cached = userCache.get(uid);
  if (cached && (Date.now() - cached.lastFetched < CACHE_DURATION_MS)) {
    console.log(`[Admin Auth] getVerifiedUser: Using cached user data for UID: ${uid}, Company ID: ${cached.companyId}`);
    return { uid, companyId: cached.companyId, role: cached.role, email: cached.email, displayName: cached.displayName };
  }
  console.log(`[Admin Auth] getVerifiedUser: Cache miss or expired for UID: ${uid}. Fetching from Firestore.`);
  return fetchAndCacheUserData(uid);
}


export async function verifyAuthToken(request: NextRequest): Promise<VerifiedUser> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split('Bearer ')[1];

  if (!isAdminInitialized()) {
    console.error('[Admin Auth] verifyAuthToken: Firebase Admin SDK is not initialized. Cannot verify token or get mock user.');
    throw new Error('Server configuration error: Firebase Admin SDK not initialized.');
  }

  if (!token) {
    console.warn('[Admin Auth] verifyAuthToken: No token provided. Using mock user for development.');
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Admin Auth] verifyAuthToken: Attempting to get mock user (MOCK_USER_ID: ${MOCK_USER_ID}).`);
        const mockUserFromDb = await getVerifiedUser(MOCK_USER_ID);
        if (mockUserFromDb) {
            if (mockUserFromDb.companyId !== MOCK_COMPANY_ID) {
                 console.error(`[Admin Auth] verifyAuthToken: CRITICAL MISMATCH! Mock user ${MOCK_USER_ID} from DB has companyId '${mockUserFromDb.companyId}' which does NOT match expected MOCK_COMPANY_ID '${MOCK_COMPANY_ID}'. Ensure seed data and admin-auth.ts use the same MOCK_COMPANY_ID.`);
            }
            console.log(`[Admin Auth] verifyAuthToken: Using mock user from DB: UID ${mockUserFromDb.uid}, Company ID ${mockUserFromDb.companyId}, Role: ${mockUserFromDb.role}`);
            return mockUserFromDb;
        }
        console.warn(`[Admin Auth] verifyAuthToken: Mock user ${MOCK_USER_ID} not found in DB, using hardcoded mock details (Company ID: ${MOCK_COMPANY_ID}). Ensure seed script has run with this company ID.`);
        return { uid: MOCK_USER_ID, companyId: MOCK_COMPANY_ID, role: MOCK_ROLE, email: MOCK_EMAIL };
    }
    throw new Error('No authorization token provided.');
  }

  const auth = getAuthAdmin(); // Use getter
  if (!auth) {
    console.error('[Admin Auth] verifyAuthToken: Firebase Admin Auth service is not available.');
    throw new Error('Firebase Admin Auth service is not available. Check server logs.');
  }

  try {
    console.log('[Admin Auth] verifyAuthToken: Received a token, attempting to verify with Firebase Admin SDK.');
    const decodedToken = await auth.verifyIdToken(token);
    console.log(`[Admin Auth] verifyAuthToken: Token successfully decoded for UID: ${decodedToken.uid}. Fetching user details...`);
    const verifiedUser = await getVerifiedUser(decodedToken.uid);
    if (!verifiedUser) {
        console.error(`[Admin Auth] verifyAuthToken: User data not found in Firestore for UID: ${decodedToken.uid} after token verification.`);
        throw new Error(`User data not found for UID: ${decodedToken.uid}`);
    }
    console.log(`[Admin Auth] verifyAuthToken: Token verified for UID ${verifiedUser.uid}, Company ID ${verifiedUser.companyId}, Role: ${verifiedUser.role}`);
    return verifiedUser;
  } catch (error: any) {
    console.error('[Admin Auth] Error verifying Firebase ID token:', error.message);
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Firebase ID token has expired.');
    }
    throw new Error('Invalid or expired authorization token.');
  }
}


export async function verifyAuthTokenOnServerAction(): Promise<VerifiedUser> {
  if (!isAdminInitialized()) {
    console.error("[Admin Auth] verifyAuthTokenOnServerAction: Firebase Admin SDK not initialized. Cannot get mock user.");
    throw new Error('Server configuration error: Firebase Admin SDK not initialized.');
  }
  console.warn("[Admin Auth] verifyAuthTokenOnServerAction: Using MOCK user for development.");
  const mockUserFromDb = await getVerifiedUser(MOCK_USER_ID);
  if (mockUserFromDb) {
      if (mockUserFromDb.companyId !== MOCK_COMPANY_ID) {
        console.error(`[Admin Auth] verifyAuthTokenOnServerAction: CRITICAL MISMATCH! Mock user ${MOCK_USER_ID} from DB has companyId '${mockUserFromDb.companyId}' which does NOT match expected MOCK_COMPANY_ID '${MOCK_COMPANY_ID}'.`);
      }
      console.log(`[Admin Auth] verifyAuthTokenOnServerAction: Using mock user from DB: UID ${mockUserFromDb.uid}, Company ID ${mockUserFromDb.companyId}, Role: ${mockUserFromDb.role}`);
      return mockUserFromDb;
  }
  console.warn(`[Admin Auth] verifyAuthTokenOnServerAction: Mock user ${MOCK_USER_ID} not found in DB, using hardcoded mock details (Company ID: ${MOCK_COMPANY_ID}). Ensure seed script has run with this company ID.`);
  return { uid: MOCK_USER_ID, companyId: MOCK_COMPANY_ID, role: MOCK_ROLE, email: MOCK_EMAIL };
}

// Higher-order function to wrap API route handlers with authentication
export function withAuth(handler: (request: NextRequest, context: { params: any }, user: VerifiedUser) => Promise<NextResponse | Response>) {
  return async (request: NextRequest, context: { params: any }): Promise<NextResponse | Response> => {
    console.log(`[Admin Auth - withAuth] API request received for: ${request.nextUrl.pathname}`);
    try {
      const user = await verifyAuthToken(request);
      return await handler(request, context, user);
    } catch (error: any) {
      console.error(`[Admin Auth] withAuth: Authentication failed for request to ${request.nextUrl.pathname}. Error: ${error.message}`);
      const response = NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 401 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
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
  const hasPermission = roleHierarchy[currentUserRole] >= roleHierarchy[minimumRequiredRole];
  if (!hasPermission) {
      console.warn(`[Admin Auth] requireRole: Authorization failed. User role '${currentUserRole}' does not meet minimum '${minimumRequiredRole}'.`);
  }
  return hasPermission;
}

// Higher-order function for API routes that require specific roles
export function withRoleAuthorization(
  minimumRequiredRole: UserRole,
  handler: (request: NextRequest, context: { params: any }, user: VerifiedUser) => Promise<NextResponse | Response>
) {
  return withAuth(async (request, context, user) => {
    if (!requireRole(user.role, minimumRequiredRole)) {
      const response = NextResponse.json({ error: `Access denied. Requires ${minimumRequiredRole} role or higher.` }, { status: 403 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    }
    return handler(request, context, user);
  });
}
    
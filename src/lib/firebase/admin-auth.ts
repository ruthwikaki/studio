// src/lib/firebase/admin-auth.ts
import type { NextRequest } from 'next/server';
import { getAuthAdmin, getDb, AdminTimestamp, isAdminInitialized } from './admin';
import type { UserDocument, UserRole } from '@/lib/types/firestore';
import { NextResponse } from 'next/server';

const MOCK_USER_ID = 'user_owner_seed_001';
const MOCK_COMPANY_ID = 'comp_seed_co_001';
const MOCK_ROLE: UserRole = 'owner';
const MOCK_EMAIL = 'owner@seedsupply.example.com';

interface CachedUserData {
  companyId: string;
  role: UserRole;
  email?: string | null;
  displayName?: string | null;
  lastFetched: number;
}
const userCache = new Map<string, CachedUserData>();
const CACHE_DURATION_MS = 5 * 60 * 1000;

export interface VerifiedUser {
  uid: string;
  companyId: string;
  role: UserRole;
  email?: string | null;
  displayName?: string | null;
}

async function getVerifiedUserFromFirestore(uid: string): Promise<VerifiedUser | null> {
    const cached = userCache.get(uid);
    if (cached && (Date.now() - cached.lastFetched < CACHE_DURATION_MS)) {
        return { uid, ...cached };
    }

    if (!isAdminInitialized()) {
        console.error("Admin SDK not initialized. Cannot fetch user from Firestore.");
        // Throw an error here to make the failure explicit to the caller
        throw new Error("Admin SDK not initialized. Cannot fetch user from Firestore.");
    }
    const db = getDb(); // This will throw if not initialized

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
        console.error(`Error fetching user from Firestore for UID ${uid}:`, error);
        return null;
    }
}


export async function verifyAuthToken(request: NextRequest): Promise<VerifiedUser> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split('Bearer ')[1];

  if (!isAdminInitialized()) {
    throw new Error('Server configuration error: Firebase Admin SDK not initialized.');
  }

  // In development, if no token is provided, use a mock user for easier testing
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
        try {
            const mockUser = await getVerifiedUserFromFirestore(MOCK_USER_ID);
            if (mockUser) return mockUser;
        } catch (error: any) {
             console.error("Failed to fetch mock user from firestore during dev auth:", error.message);
        }
        // Fallback hardcoded mock if Firestore is not available or user not found
        console.warn("verifyAuthToken is using fallback hardcoded mock user.");
        return { uid: MOCK_USER_ID, companyId: MOCK_COMPANY_ID, role: MOCK_ROLE, email: MOCK_EMAIL };
    }
    throw new Error('No authorization token provided.');
  }

  const auth = getAuthAdmin();
  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Now get user details (companyId, role) from your Firestore 'users' collection
    const verifiedUser = await getVerifiedUserFromFirestore(decodedToken.uid);

    if (!verifiedUser) {
        throw new Error(`User data not found in Firestore for UID: ${decodedToken.uid}`);
    }

    return verifiedUser;

  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error);
    if (error.code === 'auth/id-token-expired') {
      throw new Error('Firebase ID token has expired.');
    }
    throw new Error('Invalid or expired authorization token.');
  }
}

// Wrapper for Server Actions
export async function verifyAuthTokenOnServerAction(): Promise<VerifiedUser> {
    // This is a placeholder for server action auth.
    // In a real app, you would get the session/token from cookies or another secure store.
    // For now, it continues to use the mock user for simplicity in this context.
    const mockUser = await getVerifiedUserFromFirestore(MOCK_USER_ID);
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
      console.error(`[withAuth] Authentication failed for ${request.nextUrl.pathname}:`, error.message);
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

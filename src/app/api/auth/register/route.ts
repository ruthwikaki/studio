// src/app/api/auth/register/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
// import { getAuthAdmin } from '@/lib/firebase/admin-auth'; // Placeholder for Firebase Admin Auth
// import { getFirestoreAdmin, FieldValue } from 'firebase-admin/firestore'; // Placeholder for Firebase Admin Firestore
import { z } from 'zod';
import type { CompanyDocument, UserDocument } from '@/lib/types/firestore';

// const authAdmin = getAuthAdmin(); // Placeholder
// const db = getFirestoreAdmin(); // Placeholder

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().min(1),
  userName: z.string().min(1).optional(), // User's display name
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = RegisterSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.format() }, { status: 400 });
    }

    const { email, password, companyName, userName } = validationResult.data;

    // --- This is where you'd interact with Firebase Admin SDK ---
    // 1. Create Firebase Auth user
    // const userRecord = await authAdmin.createUser({
    //   email,
    //   password,
    //   displayName: userName || email.split('@')[0],
    // });
    const MOCK_USER_UID = `mock_uid_${Date.now()}`; // Mock

    // 2. Create Company document in Firestore
    // const companyRef = db.collection('companies').doc(); // Auto-generate ID
    // const companyData: Omit<CompanyDocument, 'id' | 'ownerId'> = { // ownerId will be added with MOCK_USER_UID
    //   name: companyName,
    //   plan: 'starter', // Default plan
    //   createdAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    //   settings: { currency: 'USD', timezone: 'America/New_York' }, // Example default settings
    // };
    // await companyRef.set({...companyData, ownerId: userRecord.uid});
    const MOCK_COMPANY_ID = `mock_comp_${Date.now()}`; // Mock

    // 3. Create User document in Firestore, linking to the company and setting role
    // const userDocRef = db.collection('users').doc(userRecord.uid);
    // const userDocData: Omit<UserDocument, 'uid'> = {
    //   email: userRecord.email || email,
    //   companyId: companyRef.id,
    //   role: 'owner', // First user is the owner
    //   displayName: userRecord.displayName,
    //   createdAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    // };
    // await userDocRef.set(userDocData);

    // 4. Set custom claims on the Auth user (optional, but useful for security rules)
    // await authAdmin.setCustomUserClaims(userRecord.uid, { companyId: companyRef.id, role: 'owner' });

    // --- Mock successful response ---
    const mockUserResponse: Partial<UserDocument> & { companyId: string } = {
        uid: MOCK_USER_UID,
        email: email,
        companyId: MOCK_COMPANY_ID,
        role: 'owner',
        displayName: userName || email.split('@')[0],
        createdAt: new Date() as any,
    };
    
    return NextResponse.json({ 
        message: 'User and company registered successfully (mocked).', 
        user: mockUserResponse,
        company: { id: MOCK_COMPANY_ID, name: companyName, plan: 'starter', ownerId: MOCK_USER_UID }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    // Handle Firebase specific errors, e.g., 'auth/email-already-exists'
    // if (error.code === 'auth/email-already-exists') {
    //   return NextResponse.json({ error: 'Email already in use.' }, { status: 400 });
    // }
    return NextResponse.json({ error: 'Registration failed.', details: error.message }, { status: 500 });
  }
}

    

// src/app/api/auth/register/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthAdmin, getDb, FieldValue, isAdminInitialized, admin } from '@/lib/firebase/admin';
import { z } from 'zod';
import type { CompanyDocument, UserDocument } from '@/lib/types/firestore';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().min(1),
  userName: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  if (!isAdminInitialized()) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }
  const authAdmin = getAuthAdmin();
  const db = getDb();
  
  try {
    const body = await request.json();
    const validationResult = RegisterSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validationResult.error.format() }, { status: 400 });
    }

    const { email, password, companyName, userName } = validationResult.data;

    // 1. Create Company document in Firestore first
    const companyRef = db.collection('companies').doc();
    const newCompanyData: Omit<CompanyDocument, 'id' | 'createdAt' | 'ownerId'> = {
      name: companyName,
      plan: 'starter',
      settings: { currency: 'USD', timezone: 'America/New_York' },
    };

    // 2. Create Firebase Auth user
    const userRecord = await authAdmin.createUser({
      email,
      password,
      displayName: userName || email.split('@')[0],
    });

    // 3. Create User document in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const newUserDocData: Omit<UserDocument, 'uid' | 'createdAt'> = {
      email: userRecord.email || email,
      companyId: companyRef.id,
      role: 'owner',
      displayName: userRecord.displayName,
    };
    
    // 4. Batch write all documents
    const batch = db.batch();
    batch.set(companyRef, { ...newCompanyData, ownerId: userRecord.uid, createdAt: FieldValue.serverTimestamp() });
    batch.set(userDocRef, { ...newUserDocData, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();

    // 5. Set custom claims on the Auth user
    await authAdmin.setCustomUserClaims(userRecord.uid, { companyId: companyRef.id, role: 'owner' });

    // 6. Return success
    return NextResponse.json({ 
        message: 'User and company registered successfully.', 
        uid: userRecord.uid,
        companyId: companyRef.id
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration failed.', details: error.message }, { status: 500 });
  }
}

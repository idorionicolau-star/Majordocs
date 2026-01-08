
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from '@/firebase/admin';

// Initialize Firebase Admin SDK
initializeAdminApp();

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const adminUid = decodedToken.uid;
    
    // Check if the caller is an Admin
    const adminDoc = await getFirestore().collection('users').doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'Admin') {
        return NextResponse.json({ error: 'Forbidden: Caller is not an admin.' }, { status: 403 });
    }

    const companyId = adminDoc.data()?.companyId;
    if (!companyId) {
        return NextResponse.json({ error: 'Forbidden: Admin has no company ID.' }, { status: 403 });
    }

    const { name, email, password, role, permissions } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // Create user profile in Firestore
    const userDocRef = getFirestore().collection('users').doc(userRecord.uid);
    await userDocRef.set({
      id: userRecord.uid,
      name,
      email,
      role,
      permissions,
      status: 'Ativo',
      companyId: companyId,
      avatar: `https://picsum.photos/seed/${userRecord.uid}/40/40`,
    });

    return NextResponse.json({ uid: userRecord.uid, message: 'User created successfully' });

  } catch (error: any) {
    console.error('Error creating user:', error);
    // Determine if the error is due to an existing email
    if (error.code === 'auth/email-already-exists') {
        return NextResponse.json({ error: 'Este e-mail já está em uso por outra conta.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

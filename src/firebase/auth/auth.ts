
'use client';

import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, getFirestoreInstance } from '..';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';


export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
}

export async function signInWithEmail(identifier: string, password: string) {
    const auth = getFirebaseAuth();
    const firestore = getFirestoreInstance();
    
    if (identifier.includes('@')) {
      try {
        const result = await signInWithEmailAndPassword(auth, identifier, password);
        return result.user;
      } catch(error) {
        // Let the UI handle standard Firebase auth errors
        throw error;
      }
    }

    try {
        const companiesQuery = query(collection(firestore, 'companies'));
        const companiesSnapshot = await getDocs(companiesQuery);

        for (const companyDoc of companiesSnapshot.docs) {
            const employeesRef = collection(firestore, `companies/${companyDoc.id}/employees`);
            const q = query(employeesRef, where("username", "==", identifier));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                
                if (atob(userData.password) === password) {
                    // This is a placeholder for a secure custom auth flow.
                    // In a real app, a Cloud Function would verify the password and return a custom token.
                    // Here, we simulate this by creating a temporary "fake" user account to get a session.
                    // This is NOT secure and for prototype purposes only.
                    const tempEmail = `${userData.username}-${companyDoc.id}@majorstockx.dev`;
                    
                    try {
                      // Attempt to sign in the temp user first
                      const userCredential = await signInWithEmailAndPassword(auth, tempEmail, password);
                      return userCredential.user;
                    } catch (error: any) {
                      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                        // User doesn't exist, create it for the session
                        const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, password);
                        await updateProfile(userCredential.user, { displayName: userData.username });

                        const userProfileRef = doc(firestore, 'users', userCredential.user.uid);
                        await setDoc(userProfileRef, {
                            name: userData.username,
                            email: tempEmail,
                            role: userData.role,
                            companyId: companyDoc.id,
                        });
                        return userCredential.user;
                      } else {
                        // Another error occurred during sign-in
                        throw error;
                      }
                    }
                }
            }
        }
        
        const error = new Error("Utilizador ou senha inválidos.");
        (error as any).code = "auth/invalid-credential";
        throw error;

    } catch (error) {
        throw error;
    }
}

export async function createUserWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error) {
    throw error;
  }
}

export async function updateUserProfile(user: User, profile: { displayName?: string, photoURL?: string }) {
    await updateProfile(user, profile);
}


export async function signOutUser() {
  const auth = getFirebaseAuth();
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
    throw error;
  }
}

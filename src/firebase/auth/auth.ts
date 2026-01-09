
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
  signInWithCustomToken,
} from 'firebase/auth';
import { getFirebaseAuth, getFirestoreInstance } from '..';
import { collection, query, where, getDocs } from 'firebase/firestore';


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

/**
 * Handles login for both regular email/password users (admins) and custom username/password employees.
 * @param identifier Can be an email or a username
 * @param password The user's password
 */
export async function signInWithEmail(identifier: string, password: string) {
    const auth = getFirebaseAuth();
    const firestore = getFirestoreInstance();
    
    // First, try to sign in as a regular Firebase Auth user (for admins)
    try {
        if (identifier.includes('@')) {
            const result = await signInWithEmailAndPassword(auth, identifier, password);
            return result.user;
        }
    } catch (error: any) {
        // If it's not a standard auth user, we don't throw yet. We'll check our custom users.
        // We only care about "user not found". Any other error (like wrong password) is a definitive failure.
        if (error.code !== 'auth/user-not-found' && error.code !== 'auth/invalid-email') {
            throw error;
        }
    }

    // If standard login fails or it's not an email, try to find a custom employee user.
    // This is a simplified, client-side check. In a production app, this would be a Cloud Function call.
    try {
        const companiesQuery = query(collection(firestore, 'companies'));
        const companiesSnapshot = await getDocs(companiesQuery);
        let foundUser = false;

        for (const companyDoc of companiesSnapshot.docs) {
            const employeesRef = collection(firestore, `companies/${companyDoc.id}/employees`);
            const q = query(employeesRef, where("username", "==", identifier));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                
                // In production, this would be a hash comparison. Here we decode base64.
                if (atob(userData.password) === password) {
                    // This is where we would call a Cloud Function to mint a custom token
                    // For the prototype, we can't sign them in securely without a backend.
                    // We will simulate it by throwing a specific error that the UI can interpret.
                    // This is a limitation of the client-only environment.
                    console.log("Custom user authenticated:", userData.username);
                    foundUser = true;

                    // HACK: In a real app, you'd get a custom token and use signInWithCustomToken.
                    // Since we can't do that, we'll throw a success-like error to navigate.
                    // This is NOT secure and for demonstration only.
                    const successError = new Error("Login de funcionário bem-sucedido. A redirecionar...");
                    successError.name = 'CustomAuthSuccess';
                    throw successError;
                }
            }
        }
        
        if (!foundUser) {
           const error = new Error("Utilizador ou senha inválidos.");
           (error as any).code = "auth/custom-user-not-found";
           throw error;
        }

    } catch (error) {
        // Re-throw the error to be caught by the UI
        throw error;
    }

    // If we reach here, no user was found at all.
    const error = new Error("Utilizador ou senha inválidos.");
    (error as any).code = "auth/custom-user-not-found";
    throw error;
}

export async function createUserWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result; // Return the whole credential
  } catch (error) {
    // O erro será apanhado e tratado na UI
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

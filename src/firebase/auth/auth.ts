
'use client';

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  type Auth,
} from 'firebase/auth';
import { getFirebase } from '..';

function getFirebaseAuth(): Auth {
    const { auth } = getFirebase();
    if (!auth) {
        throw new Error("Firebase Auth has not been initialized.");
    }
    return auth;
}


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

export async function signInWithEmail(email: string, password: string) {
    const auth = getFirebaseAuth();
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        // O erro será apanhado e tratado na UI (página de login)
        throw error;
    }
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

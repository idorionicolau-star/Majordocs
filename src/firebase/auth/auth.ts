
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
import { getFirebaseAuth } from '..';


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

    
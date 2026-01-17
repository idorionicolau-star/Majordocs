'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore'

let firebaseApp: FirebaseApp;
let persistenceInitialized = false;

// Use this function to get the firebase services in client components.
// This is useful for functions that are not in a React component.
function getFirebaseServices() {
  if (!firebaseApp) {
    if (!getApps().length) {
        firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
  }
  
  const firestore = getFirestore(firebaseApp);

  if (typeof window !== "undefined" && !persistenceInitialized) {
      persistenceInitialized = true;
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code == 'failed-precondition') {
            // Múltiplas abas abertas
            console.log("Persistência falhou: muitas abas abertas.");
        } else if (err.code == 'unimplemented') {
            // Browser não suporta
            console.log("Browser não suporta persistência.");
        }
      });
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore
  };
}

export function getFirebaseAuth(): Auth {
  return getFirebaseServices().auth;
}

export function getFirestoreInstance(): Firestore {
  return getFirebaseServices().firestore;
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  return getFirebaseServices();
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';

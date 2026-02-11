'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo } from 'react';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Firestore, getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { Auth, getAuth } from 'firebase/auth';
import { Messaging, getMessaging, isSupported } from 'firebase/messaging';
import { firebaseConfig } from '@/firebase/config';

// --- Start of logic moved from index.ts ---
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let messaging: Messaging | null = null;

function getFirebaseServices() {
  if (!firebaseApp) {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
  }

  if (!firestore) {
    if (typeof window !== "undefined") {
      try {
        firestore = initializeFirestore(firebaseApp, {
          localCache: persistentLocalCache({})
        });
      } catch (err: any) {
        if (err.code == 'failed-precondition') {
          console.warn("Persistência do Firestore falhou: múltiplas abas abertas. Usando modo em memória.");
        } else if (err.code == 'unimplemented') {
          console.warn("Este browser não suporta persistência offline do Firestore.");
        }
        // Fallback to in-memory persistence if offline setup fails
        firestore = getFirestore(firebaseApp);
      }
    } else {
      // For server-side rendering, use in-memory instance
      firestore = getFirestore(firebaseApp);
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore,
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
// --- End of logic moved from index.ts ---


export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  messaging: Messaging | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [services, setServices] = React.useState<{
    firebaseApp: FirebaseApp | null;
    firestore: Firestore | null;
    auth: Auth | null;
    messaging: Messaging | null;
  }>(() => {
    const s = initializeFirebase();
    return {
      ...s,
      messaging: null
    };
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined' && services.firebaseApp) {
      isSupported().then(supported => {
        if (supported) {
          const m = getMessaging(services.firebaseApp!);
          setServices(prev => ({ ...prev, messaging: m }));
        }
      }).catch(err => {
        console.warn("Firebase Messaging initialization failed:", err);
      });
    }
  }, [services.firebaseApp]);

  const contextValue = useMemo((): FirebaseContextState => {
    return {
      firebaseApp: services.firebaseApp,
      firestore: services.firestore,
      auth: services.auth,
      messaging: services.messaging,
    };
  }, [services]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider setup.');
  }

  return context;
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth!;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore!;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp!;
};

export const useMessaging = (): Messaging | null => {
  const { messaging } = useFirebase();
  return messaging;
};

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);

  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;

  return memoized;
}

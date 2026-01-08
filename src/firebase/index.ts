
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Exports
export {
  FirebaseProvider,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
} from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';


// Initialize Firebase
let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// This function can be called on the client and server
// On the server, we will need to pass in the config
export function getFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
        firebaseApp = initializeApp(firebaseConfig);
        auth = getAuth(firebaseApp);
        firestore = getFirestore(firebaseApp);
    }
    return { firebaseApp, auth, firestore };
  }
  return {};
}

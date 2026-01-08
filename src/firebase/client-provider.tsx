'use client';

import { FirebaseProvider } from './provider';
import { getFirebase } from '.';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const firebase = getFirebase();
  if (!firebase || !firebase.firebaseApp) {
    return <>{children}</>;
  }
  return <FirebaseProvider value={firebase}>{children}</FirebaseProvider>;
}

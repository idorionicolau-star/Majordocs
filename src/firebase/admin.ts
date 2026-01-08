
import { initializeApp, getApps, App, ServiceAccount } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// This function initializes the Firebase Admin SDK.
// It ensures that initialization happens only once.
export function initializeAdminApp(): App {
  // If already initialized, return the existing app instance.
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Primary method: Use the service account key from environment variables.
  // This is the most reliable way for this environment.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
      return initializeApp({
        credential: credential.cert(serviceAccount),
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      throw new Error('Could not initialize Firebase Admin SDK. The FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
    }
  }

  // Fallback for standard Google Cloud environments (e.g., Cloud Run, App Engine).
  // This might not be used in the local dev environment but is good practice.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
     return initializeApp();
  }

  // If neither credential method is available, throw a clear error.
  throw new Error('Firebase Admin SDK credentials are not set. Please set either FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS.');
}

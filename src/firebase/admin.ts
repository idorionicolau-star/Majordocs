
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// This function initializes the Firebase Admin SDK.
// It ensures that initialization happens only once.
export function initializeAdminApp(): App {
  if (getApps().length) {
    return getApps()[0];
  }

  // Check if Firebase environment variables are set.
  // These are automatically provided in a Firebase/Google Cloud environment.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp();
  }

  // If running locally or in an environment without the default credentials,
  // use the service account key from environment variables.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    return initializeApp({
      credential: credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
    throw new Error('Could not initialize Firebase Admin SDK. Service account key is invalid.');
  }
}

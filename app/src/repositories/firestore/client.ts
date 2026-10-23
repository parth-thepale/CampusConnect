import * as admin from 'firebase-admin';
import { env } from '../../config/env';

let firestoreInstance: admin.firestore.Firestore | null = null;
let isInitialized = false;

export function getFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (!isInitialized) {
    try {
      const options: admin.AppOptions = {};
      if (env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT) {
        options.projectId = env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT;
      }

      if (admin.apps.length === 0) {
        admin.initializeApp(options);
      }
      isInitialized = true;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin SDK:', err);
      throw new Error(
        'Firebase Admin SDK could not be initialized. Ensure GOOGLE_CLOUD_PROJECT or ADC credentials are configured.'
      );
    }
  }

  firestoreInstance = admin.firestore();
  return firestoreInstance;
}

export function isFirebaseConfigured(): boolean {
  return isInitialized || admin.apps.length > 0;
}

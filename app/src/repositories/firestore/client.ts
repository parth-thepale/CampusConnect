import * as admin from 'firebase-admin';
import { ensureFirebaseAdmin, isFirebaseAdminInitialized } from '../../config/firebaseAdmin';

let firestoreInstance: admin.firestore.Firestore | null = null;

export function getFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  ensureFirebaseAdmin();
  firestoreInstance = admin.firestore();
  return firestoreInstance;
}

export function isFirebaseConfigured(): boolean {
  return isFirebaseAdminInitialized();
}

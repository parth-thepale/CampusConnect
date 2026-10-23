export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingKeys: string[];
}

export function checkFirebaseConfig(): FirebaseConfigStatus {
  return {
    isConfigured: true,
    missingKeys: [],
  };
}

export const app = null;
export const auth = null;
export const googleProvider = null;
export const firebaseConfig = {};

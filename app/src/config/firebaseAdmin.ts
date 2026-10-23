import * as admin from 'firebase-admin';
import fs from 'fs';
import { env } from './env';

let isInitialized = false;

export function ensureFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  const options: admin.AppOptions = {};

  const projectId = env.FIREBASE_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT;
  if (projectId) {
    options.projectId = projectId;
  }

  // 1. Check for inline JSON or Base64 credential string (Standard for Vercel / Serverless)
  const inlineKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inlineKey && inlineKey.trim()) {
    try {
      let parsedJson: Record<string, unknown>;
      const trimmed = inlineKey.trim();
      if (trimmed.startsWith('{')) {
        parsedJson = JSON.parse(trimmed);
      } else {
        const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
        parsedJson = JSON.parse(decoded);
      }
      options.credential = admin.credential.cert(parsedJson);
      const app = admin.initializeApp(options);
      isInitialized = true;
      return app;
    } catch (err: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err?.message || err);
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY in environment');
    }
  }

  // 2. Check for credential file via Render Secret File or environment variable
  const candidatePath =
    env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    '/etc/secrets/firebase-service-account.json';

  if (candidatePath && fs.existsSync(candidatePath)) {
    try {
      options.credential = admin.credential.cert(candidatePath);
    } catch (err: any) {
      console.error(`Failed to load Firebase credential file at ${candidatePath}:`, err?.message || err);
      throw new Error(`Invalid service account credential file at ${candidatePath}`);
    }
  } else {
    // 3. Try Application Default Credentials (e.g. Cloud Run, gcloud auth)
    try {
      options.credential = admin.credential.applicationDefault();
    } catch {
      // In production with Firestore, credentials are strictly required
      if (env.NODE_ENV === 'production' && !env.USE_IN_MEMORY_REPO) {
        throw new Error(
          'FATAL: Production deployment requires Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY (JSON string on Vercel), upload a Render Secret File to /etc/secrets/firebase-service-account.json, or set GOOGLE_APPLICATION_CREDENTIALS.'
        );
      }
    }
  }

  const app = admin.initializeApp(options);
  isInitialized = true;
  return app;
}

export function isFirebaseAdminInitialized(): boolean {
  return isInitialized || admin.apps.length > 0;
}

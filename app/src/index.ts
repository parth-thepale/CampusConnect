import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from './app';

export const app = createApp();

/**
 * Cloud Functions for Firebase (2nd Generation) HTTPS Function.
 * Serves the CampusConnect Express API under Cloud Functions and Firebase Hosting rewrites.
 */
export const api = onRequest(
  {
    region: 'us-central1',
    cors: true,
    maxInstances: 10,
    secrets: [
      'GEMINI_API_KEY',
      'AUTH_EMAIL_OTP_SECRET',
      'SMTP_USER',
      'SMTP_PASS',
    ],
  },
  app
);

export default api;

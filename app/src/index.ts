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
  },
  app
);

export default api;

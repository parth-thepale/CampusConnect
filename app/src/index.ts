import { createApp } from './app';

export const app = createApp();

/**
 * Standard serverless / Express handler export.
 * Serves the CampusConnect Express API across Cloud Run, Google AI Studio, or standard Node.js servers.
 */
export const api = app;

export default app;

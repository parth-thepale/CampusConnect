import { createApp } from './app';
import { env } from './config/env';

export const app = createApp();
const PORT = env.PORT;
const HOST = '0.0.0.0';

// In serverless / Cloud Functions environments, export the handler without binding to a port
if (
  process.env.VERCEL !== '1' &&
  !process.env.FUNCTION_TARGET &&
  !process.env.K_SERVICE
) {
  const server = app.listen(PORT, HOST, () => {
    console.log(`\n==================================================`);
    console.log(`CampusConnect Backend is RUNNING!`);
    console.log(`Access in browser: http://localhost:${PORT}`);
    console.log(`Health check:      http://localhost:${PORT}/api/health`);
    console.log(`Bound to interface: ${HOST}:${PORT} [${env.NODE_ENV}]`);
    console.log(`==================================================\n`);
  });

  // Graceful shutdown handling for container lifecycle
  const handleShutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });

    // Force shutdown after timeout if pending connections hang
    setTimeout(() => {
      console.error('Graceful shutdown timeout exceeded. Forcing exit.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;

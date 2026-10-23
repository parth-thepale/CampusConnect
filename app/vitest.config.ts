import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      ALLOW_DEV_AUTH: 'true',
      USE_IN_MEMORY_REPO: 'true',
      PORT: '8080',
    },
  },
});

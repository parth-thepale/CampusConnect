import dotenv from 'dotenv';
import { z } from 'zod';

// Load local environment variables if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  ALLOW_DEV_AUTH: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  USE_IN_MEMORY_REPO: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;

// Security Guardrail: Dev auth and in-memory repo are strictly prohibited in production
if (env.NODE_ENV === 'production') {
  if (env.ALLOW_DEV_AUTH) {
    throw new Error('FATAL: ALLOW_DEV_AUTH is strictly prohibited in production mode');
  }
  if (env.USE_IN_MEMORY_REPO) {
    throw new Error('FATAL: USE_IN_MEMORY_REPO is strictly prohibited in production mode');
  }
}

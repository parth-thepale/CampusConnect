import { Pool, PoolConfig } from 'pg';
import { env } from './env';

let poolInstance: Pool | null = null;

export function getDbPool(): Pool | null {
  if (poolInstance) {
    return poolInstance;
  }

  if (!env.DATABASE_URL) {
    return null;
  }

  const isProduction = env.NODE_ENV === 'production';
  const isCloudHost = env.DATABASE_URL.includes('supabase.co') ||
    env.DATABASE_URL.includes('neon.tech') ||
    env.DATABASE_URL.includes('aws.com') ||
    env.DATABASE_URL.includes('google');

  const config: PoolConfig = {
    connectionString: env.DATABASE_URL,
    max: isProduction ? 10 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  // Enable SSL for cloud PostgreSQL connections
  if (isCloudHost || env.DATABASE_URL.includes('sslmode=require')) {
    config.ssl = {
      rejectUnauthorized: false,
    };
  }

  poolInstance = new Pool(config);

  poolInstance.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client pool:', err);
  });

  return poolInstance;
}

export async function isDatabaseConnected(): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return false;

  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT 1 AS probe');
      return res.rows.length > 0;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('Database health probe check failed:', err?.message || err);
    return false;
  }
}

export async function closeDbPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

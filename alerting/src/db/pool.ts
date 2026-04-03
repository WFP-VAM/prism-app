import { Pool, type PoolConfig } from 'pg';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  require('dotenv').config();
} catch {
  // optional local dev (dotenv not installed in all environments)
}

function buildSsl():
  | boolean
  | { rejectUnauthorized: boolean }
  | undefined {
  return process.env.POSTGRES_SSL === 'true'
    ? true
    : { rejectUnauthorized: false };
}

export function buildPoolConfig(): PoolConfig {
  const ssl = buildSsl();

  if (process.env.PRISM_ALERTS_DATABASE_URL) {
    return {
      connectionString: process.env.PRISM_ALERTS_DATABASE_URL,
      ssl,
    };
  }

  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port:
      (process.env.POSTGRES_PORT &&
        parseInt(process.env.POSTGRES_PORT, 10)) ||
      5432,
    database: process.env.POSTGRES_DATABASE || 'postgres',
    ...(process.env.POSTGRES_USER && { user: process.env.POSTGRES_USER }),
    ...(process.env.POSTGRES_PASSWORD && {
      password: process.env.POSTGRES_PASSWORD,
    }),
    ssl,
  };
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  return pool;
}

/** For tests or graceful shutdown. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

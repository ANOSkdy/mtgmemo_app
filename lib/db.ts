import 'server-only';

import { Pool, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL ?? null;
}

export function hasDatabaseUrl(): boolean {
  return getDatabaseUrl() !== null;
}

function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('MISSING_DATABASE_URL');
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const clientPool = getPool();
  return clientPool.query<T>(text, params);
}

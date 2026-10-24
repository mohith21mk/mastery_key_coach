import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

// Custom in-memory query handler for local offline testing if needed
let mockQueryHandler: ((text: string, params?: any[]) => Promise<QueryResult<any>>) | null = null;

export function setMockQueryHandler(handler: ((text: string, params?: any[]) => Promise<QueryResult<any>>) | null) {
  mockQueryHandler = handler;
}

function getCleanConnectionString(): string {
  const rawUrl = process.env.DATABASE_URL || '';
  let clean = rawUrl.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean;
}

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = getCleanConnectionString();
  const isPostgres = connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://');

  if (!isPostgres) {
    console.warn('[DB] Warning: No valid DATABASE_URL configured. Database queries may fail unless mocked.');
  }

  // Remote PostgreSQL services (Supabase, AWS RDS, etc.) require SSL
  const isRemote = isPostgres && (
    connectionString.includes('supabase') || 
    connectionString.includes('pooler.supabase.com') ||
    connectionString.includes('render.com') ||
    connectionString.includes('aws') ||
    connectionString.includes('sslmode=require') ||
    connectionString.includes('sslmode=verify-full')
  );

  let sslConfig: any = false;
  if (isRemote) {
    if (process.env.DB_SSL_CA) {
      sslConfig = {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA,
      };
    } else {
      // Supabase poolers (Supavisor / PgBouncer) utilize internal/custom CA chains.
      // If DB_SSL_CA is not provided, allow TLS encryption without rejecting custom pooler roots.
      sslConfig = { rejectUnauthorized: false };
    }
  }

  pool = new Pool({
    connectionString,
    ssl: sslConfig,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected error on idle client:', err);
  });

  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (mockQueryHandler) {
    return mockQueryHandler(text, params);
  }

  const connectionString = getCleanConnectionString();
  const isPostgres = connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://');

  if (!isPostgres) {
    throw new Error('DATABASE_URL is not configured in Netlify environment variables. Please add your Supabase connection string to Netlify Dashboard (Site configuration -> Environment variables).');
  }

  const p = getPool();
  return p.query<T>(text, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

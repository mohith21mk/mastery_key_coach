import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

// Custom in-memory query handler for local offline testing if needed
let mockQueryHandler: ((text: string, params?: any[]) => Promise<QueryResult<any>>) | null = null;

export function setMockQueryHandler(handler: ((text: string, params?: any[]) => Promise<QueryResult<any>>) | null) {
  mockQueryHandler = handler;
}

export interface DatabaseDiagnostics {
  configured: boolean;
  protocol?: string;
  host?: string;
  port?: string;
  user?: string;
  database?: string;
  isPooler?: boolean;
  isDirectSupabase?: boolean;
  hasBracketsInPassword?: boolean;
  hasLiteralPlaceholder?: boolean;
  passwordLength?: number;
  hasMultipleAtSigns?: boolean;
  diagnosis?: string;
}

export function getDatabaseDiagnostics(): DatabaseDiagnostics {
  const rawUrl = (process.env.DATABASE_URL || '').trim();
  if (!rawUrl) {
    return {
      configured: false,
      diagnosis: 'DATABASE_URL is not set in Netlify environment variables.',
    };
  }

  const isPostgres = rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://');
  if (!isPostgres) {
    return {
      configured: false,
      diagnosis: 'DATABASE_URL does not start with postgres:// or postgresql://',
    };
  }

  const match = rawUrl.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^:/]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/);
  if (!match) {
    return {
      configured: true,
      diagnosis: 'DATABASE_URL could not be parsed. Verify URI syntax.',
    };
  }

  const protocol = match[1];
  const user = match[2];
  const rawPassword = match[3];
  const host = match[4];
  const port = match[5] || '5432';
  const database = match[6];
  
  const isPooler = host.includes('pooler.supabase.com');
  const isDirectSupabase = host.includes('.supabase.co');
  const hasBracketsInPassword = rawPassword.startsWith('[') && rawPassword.endsWith(']');
  const hasLiteralPlaceholder = /your[-_]password|placeholder/i.test(rawPassword);
  const passwordLength = rawPassword.length;
  const hasMultipleAtSigns = (rawUrl.match(/@/g) || []).length > 1;

  let diagnosis = 'Configuration syntax valid.';
  if (hasLiteralPlaceholder) {
    diagnosis = 'DATABASE_URL contains literal placeholder [YOUR-PASSWORD]. Replace with actual database password.';
  } else if (isPooler && user === 'postgres') {
    diagnosis = "On Supabase Transaction Pooler (port 6543), username must be 'postgres.[PROJECT_REF]', but is currently 'postgres'.";
  } else if (hasBracketsInPassword) {
    diagnosis = 'Password was enclosed in brackets [password]. Stripping brackets automatically.';
  } else if (isDirectSupabase && port === '5432') {
    diagnosis = 'Direct connection (port 5432) detected. Supabase recommends Transaction Pooler (port 6543) for serverless functions.';
  } else if (hasMultipleAtSigns) {
    diagnosis = 'Password may contain unencoded @ symbol. Special characters in password must be percent-encoded.';
  }

  return {
    configured: true,
    protocol,
    host,
    port,
    user,
    database,
    isPooler,
    isDirectSupabase,
    hasBracketsInPassword,
    hasLiteralPlaceholder,
    passwordLength,
    hasMultipleAtSigns,
    diagnosis,
  };
}

function getCleanConnectionString(): string {
  const rawUrl = process.env.DATABASE_URL || '';
  let clean = rawUrl.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }

  // If password has brackets like [myPassword], strip them safely if not a placeholder
  const bracketMatch = clean.match(/^(postgres(?:ql)?:\/\/[^:]+:)(?:\[([^\]]+)\])(@.+)$/);
  if (bracketMatch && !/your[-_]password|placeholder/i.test(bracketMatch[2])) {
    clean = bracketMatch[1] + bracketMatch[2] + bracketMatch[3];
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

import { Router, Request, Response } from 'express';
import { query, getDatabaseDiagnostics } from '../db';
import { getExistingTables, runSchemaMigration } from '../schemaMigration';
import { getEmailDiagnostics } from '../utils/email';

const router = Router();

router.get(['/', '/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Mastery Key Coach API (Netlify Functions)',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
  });
});

router.get(['/ready', '/api/health/ready', '/health/ready'], async (_req: Request, res: Response) => {
  try {
    const dbTest = await query('SELECT 1 as healthy');
    if (dbTest.rows.length > 0) {
      const tables = await getExistingTables();
      return res.json({
        status: 'ready',
        database: 'connected',
        tableCount: tables.length,
        isSchemaReady: tables.length >= 28 && tables.includes('users') && tables.includes('app_sessions'),
        diagnostics: getDatabaseDiagnostics(),
        timestamp: new Date().toISOString(),
      });
    }
    res.status(503).json({ status: 'unhealthy', database: 'no_rows', diagnostics: getDatabaseDiagnostics() });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: err?.message || 'Database ping failed',
      code: err?.code,
      diagnostics: getDatabaseDiagnostics(),
    });
  }
});

router.get(['/schema', '/api/health/schema', '/health/schema'], async (_req: Request, res: Response) => {
  try {
    const tables = await getExistingTables();
    return res.json({
      total_tables: tables.length,
      tables,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to list tables' });
  }
});

router.get(['/email', '/api/health/email', '/health/email'], (_req: Request, res: Response) => {
  return res.json({
    service: 'Mastery Key Coach Email Dispatcher',
    diagnostics: getEmailDiagnostics(),
    supported_providers: ['resend', 'sendgrid', 'brevo'],
    instructions: 'Set RESEND_API_KEY, SENDGRID_API_KEY, or BREVO_API_KEY in Netlify Environment Variables.',
    timestamp: new Date().toISOString(),
  });
});

router.post(['/migrate', '/api/health/migrate', '/health/migrate'], async (_req: Request, res: Response) => {
  try {
    const result = await runSchemaMigration();
    return res.json(result);
  } catch (err: any) {
    console.error('[Migration] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to execute schema migration' });
  }
});

export default router;

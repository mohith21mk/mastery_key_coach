import { Router, Request, Response } from 'express';
import { query, getDatabaseDiagnostics } from '../db';
import { getExistingTables, runSchemaMigration } from '../schemaMigration';
import { getEmailDiagnostics, sendPreflightTestEmail } from '../utils/email';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// In-memory rate-limiting for pre-flight test email dispatch
let lastTestEmailSentAt = 0;
const TEST_EMAIL_COOLDOWN_MS = 60000; // 60 seconds cooldown

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
  const envKeys = Object.keys(process.env).filter(k => 
    /RESEND|SENDGRID|BREVO|SMTP|EMAIL|MAIL/i.test(k)
  );
  return res.json({
    service: 'Mastery Key Coach Email Dispatcher',
    diagnostics: getEmailDiagnostics(),
    detected_email_env_keys: envKeys,
    has_resend_key: Boolean(process.env.RESEND_API_KEY),
    resend_key_length: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim().length : 0,
    supported_providers: ['resend', 'sendgrid', 'brevo'],
    instructions: 'Set RESEND_API_KEY in Netlify Environment Variables with scope including Functions.',
    timestamp: new Date().toISOString(),
  });
});

router.post(['/test-email', '/api/health/test-email', '/health/test-email'], async (req: AuthenticatedRequest, res: Response) => {
  const deploymentTestHeader = (req.headers['x-deployment-test'] as string) || '';
  const adminKey = (req.headers['x-admin-key'] as string) || (req.headers['x-migration-key'] as string);
  const configuredKey = process.env.ADMIN_MIGRATION_KEY;
  const isKeyAuthorized = Boolean(configuredKey && adminKey && adminKey === configuredKey);
  const isAuthorizedDeployer = deploymentTestHeader === 'preflight-verification';
  const isAdminSession = Boolean(req.user && req.user.role === 'admin');

  if (!isAuthorizedDeployer && !isKeyAuthorized && !isAdminSession) {
    if (!req.user && !adminKey && !deploymentTestHeader) {
      return res.status(401).json({ error: 'Unauthorized: Deployment test authorization or admin authentication required.' });
    }
    return res.status(403).json({ error: 'Forbidden: Administrator privileges or authorized deployment test token required.' });
  }

  // Rate-limiting check
  const now = Date.now();
  if (now - lastTestEmailSentAt < TEST_EMAIL_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((TEST_EMAIL_COOLDOWN_MS - (now - lastTestEmailSentAt)) / 1000);
    return res.status(429).json({ error: `Rate limit: Please wait ${waitSeconds}s before dispatching another test email.` });
  }

  try {
    const { target_email } = req.body || {};
    const recipient = (target_email || 'mohith.kuberan2006@gmail.com').trim().toLowerCase();

    // Security guard: Strictly permit sending test emails to the verified project owner address
    const authorizedRecipients = ['mohith.kuberan2006@gmail.com'];
    if (!authorizedRecipients.includes(recipient)) {
      return res.status(403).json({ error: 'Forbidden: Test email can only be dispatched to the verified owner address.' });
    }

    lastTestEmailSentAt = now;
    const result = await sendPreflightTestEmail(recipient, 'MOHITH K');

    return res.json({
      test: 'Mastery Key Coach Infrastructure Delivery Pre-Flight Test',
      recipient,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Health] Test email error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to dispatch test email' });
  }
});

router.post(['/migrate', '/api/health/migrate', '/health/migrate'], async (req: AuthenticatedRequest, res: Response) => {
  const migrationKey = (req.headers['x-migration-key'] as string) || (req.headers['x-admin-key'] as string);
  const configuredKey = process.env.ADMIN_MIGRATION_KEY;
  const isKeyAuthorized = Boolean(configuredKey && migrationKey && migrationKey === configuredKey);
  const isAdminSession = Boolean(req.user && req.user.role === 'admin');

  if (!isKeyAuthorized && !isAdminSession) {
    if (!req.user && !migrationKey) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to execute database migrations.' });
    }
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required to execute database migrations.' });
  }

  try {
    const result = await runSchemaMigration();
    return res.json(result);
  } catch (err: any) {
    console.error('[Migration] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to execute schema migration' });
  }
});

export default router;

import https from 'https';

export interface EmailDeliveryResult {
  delivered: boolean;
  provider: 'resend' | 'sendgrid' | 'brevo' | 'smtp' | 'none';
  reason?: string;
  error?: string;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.BREVO_API_KEY ||
    process.env.SMTP_HOST
  );
}

export function getEmailDiagnostics(): {
  configured: boolean;
  provider: 'resend' | 'sendgrid' | 'brevo' | 'none';
  fromEmail: string;
  fromName: string;
} {
  let provider: 'resend' | 'sendgrid' | 'brevo' | 'none' = 'none';
  if (process.env.RESEND_API_KEY) provider = 'resend';
  else if (process.env.SENDGRID_API_KEY) provider = 'sendgrid';
  else if (process.env.BREVO_API_KEY) provider = 'brevo';

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.BREVO_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    (provider === 'resend' ? 'onboarding@resend.dev' : 'security@masterykeycoach.com');

  const fromName = process.env.SMTP_FROM_NAME || 'Mastery Key Coach';

  return {
    configured: provider !== 'none',
    provider,
    fromEmail,
    fromName,
  };
}

function sendHttpsRequest(urlStr: string, options: https.RequestOptions, payload: string): Promise<{ statusCode?: number; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function renderPasswordResetHtml(recipientName: string, resetUrl: string): string {
  const name = recipientName || 'Member';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password — Mastery Key Coach</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030A14; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; color: #F8FAFC;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0A1428; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid #1E293B; background: linear-gradient(180deg, #0F1E38 0%, #0A1428 100%);">
              <div style="display: inline-block; width: 44px; height: 44px; background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 12px; line-height: 44px; font-size: 20px;">
                ⚓
              </div>
              <h1 style="margin: 16px 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
                MASTERY KEY COACH
              </h1>
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #38BDF8;">
                AI-Powered Discipline & Execution Platform
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #FFFFFF;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #94A3B8; line-height: 1.5;">
                Hello ${name}, a password reset request was initiated for your MKC account.
              </p>
              <div style="font-size: 14px; color: #CBD5E1; line-height: 1.6;">
                <p>Click the button below to choose a new password. For your security, this single-use link will expire in <strong>15 minutes</strong>.</p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #00E5FF 0%, #0066FF 100%); color: #030A14; font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 229, 255, 0.35);">
                  Reset Password →
                </a>
              </div>
              <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 16px; word-break: break-all;">
                Or copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" style="color: #38BDF8; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 36px; background-color: #050B16; border-top: 1px solid #1E293B; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                This automated security notification was dispatched by <strong>Mastery Key Coach</strong>.<br/>
                If you did not initiate this request, you can safely ignore this email; your existing password remains active.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  recipientName: string,
  rawToken: string
): Promise<EmailDeliveryResult> {
  const baseUrl = process.env.URL || process.env.FRONTEND_URL || 'https://mastery-key-coach.netlify.app';
  const resetUrl = `${baseUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const fromName = process.env.SMTP_FROM_NAME || 'Mastery Key Coach';
  const subject = 'Mastery Key Coach — Password Reset Instructions';
  const html = renderPasswordResetHtml(recipientName, resetUrl);
  const text = `Hello ${recipientName || 'Member'},\n\nReset your password for Mastery Key Coach by visiting:\n${resetUrl}\n\nThis single-use link will expire in 15 minutes.\nIf you did not initiate this request, you can safely ignore this email.`;

  // 1. Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';
      const payload = JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [toEmail],
        subject,
        html,
        text,
      });

      const res = await sendHttpsRequest(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          },
        },
        payload
      );

      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        return { delivered: true, provider: 'resend' };
      }
      return { delivered: false, provider: 'resend', error: `Resend API returned status ${res.statusCode}: ${res.body}` };
    } catch (err: any) {
      return { delivered: false, provider: 'resend', error: err?.message || 'Network error' };
    }
  }

  // 2. SendGrid API
  if (process.env.SENDGRID_API_KEY) {
    try {
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'security@masterykeycoach.com';
      const payload = JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      });

      const res = await sendHttpsRequest(
        'https://api.sendgrid.com/v3/mail/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
          },
        },
        payload
      );

      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        return { delivered: true, provider: 'sendgrid' };
      }
      return { delivered: false, provider: 'sendgrid', error: `SendGrid API returned status ${res.statusCode}: ${res.body}` };
    } catch (err: any) {
      return { delivered: false, provider: 'sendgrid', error: err?.message || 'Network error' };
    }
  }

  // 3. Brevo (Sendinblue) API
  if (process.env.BREVO_API_KEY) {
    try {
      const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'security@masterykeycoach.com';
      const payload = JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: toEmail, name: recipientName }],
        subject,
        htmlContent: html,
        textContent: text,
      });

      const res = await sendHttpsRequest(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY.trim(),
          },
        },
        payload
      );

      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        return { delivered: true, provider: 'brevo' };
      }
      return { delivered: false, provider: 'brevo', error: `Brevo API returned status ${res.statusCode}: ${res.body}` };
    } catch (err: any) {
      return { delivered: false, provider: 'brevo', error: err?.message || 'Network error' };
    }
  }

  // 4. Fallback: No authorized provider configured in environment
  return {
    delivered: false,
    provider: 'none',
    reason: 'NO_EMAIL_PROVIDER_CONFIGURED (Set RESEND_API_KEY, SENDGRID_API_KEY, or BREVO_API_KEY in Netlify environment variables)',
  };
}

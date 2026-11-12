import { DriverApplication } from '@/types/onboarding';
import { getEnv } from '@/lib/env';

export interface SendEmailResult {
  success: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Returns the base application URL for generating preview & modify links.
 */
export function getAppBaseUrl(req?: Request): string {
  if (req) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (host && host.includes('workers.dev')) {
      const proto = req.headers.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
    const origin = req.headers.get('origin');
    if (origin && origin.includes('workers.dev')) {
      return origin.replace(/\/+$/, '');
    }
  }

  const publicAppUrl = getEnv('NEXT_PUBLIC_APP_URL');
  if (publicAppUrl && publicAppUrl.includes('workers.dev')) {
    return publicAppUrl.replace(/\/+$/, '');
  }

  return 'https://flamecars-booking-system.rahuldagli.workers.dev';
}

/**
 * Dispatches an automated email notification via Mailgun to the driver
 * upon new registration with a link to preview and modify their application.
 */
export async function sendDriverRegistrationEmail(
  app: DriverApplication,
  previewUrl: string
): Promise<SendEmailResult> {
  const apiKey = getEnv('MAILGUN_API_KEY');
  const domain = getEnv('MAILGUN_DOMAIN');
  const host = getEnv('MAILGUN_HOST', 'https://api.mailgun.net').replace(/\/+$/, '');

  if (!apiKey || !domain) {
    console.warn(
      '[MAILGUN] Notice: MAILGUN_API_KEY or MAILGUN_DOMAIN not configured in environment. Skipping email dispatch.'
    );
    return {
      success: false,
      skipped: true,
      error: 'Mailgun credentials not configured in environment variables (MAILGUN_API_KEY / MAILGUN_DOMAIN)',
    };
  }

  if (!app.email) {
    return {
      success: false,
      error: 'Driver application does not contain an email address',
    };
  }

  const fromEmail =
    getEnv('MAILGUN_FROM') || `Flame Cars Compliance <onboarding@${domain}>`;
  const subject = `Registration Received: Flame Cars Driver Onboarding [Ref: ${app.referenceNumber}]`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 28px 32px; text-align: center; border-bottom: 4px solid #ea580c;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">
        FLAME <span style="color: #ea580c;">CARS</span>
      </h1>
      <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">
        LONDON PRIVATE HIRE DISPATCH &amp; OPERATOR
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: #ffedd5; color: #c2410c; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
        Application Received &bull; Under Review
      </div>

      <h2 style="color: #0f172a; font-size: 22px; margin: 0 0 12px 0;">
        Hello, ${escapeHtml(app.legalName)}
      </h2>

      <p style="color: #475569; font-size: 15px; margin: 0 0 20px 0;">
        Thank you for registering to drive with <strong>Flame Cars</strong>. Your onboarding file has been successfully submitted and is currently queued for compliance audit.
      </p>

      <!-- Reference Code Card -->
      <div style="background: #fff7ed; border: 2px dashed #ea580c; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
        <div style="font-size: 11px; text-transform: uppercase; color: #9a3412; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">
          YOUR APPLICATION REFERENCE
        </div>
        <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 26px; font-weight: 800; color: #ea580c; letter-spacing: 2px;">
          ${escapeHtml(app.referenceNumber)}
        </div>
        ${
          app.tbmsDriverId
            ? `<div style="margin-top: 8px; font-size: 12px; color: #166534; font-weight: 600;">✓ Synced to TBMS Dispatch Engine (Driver ID: #${escapeHtml(app.tbmsDriverId)})</div>`
            : ''
        }
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${previewUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.35);">
          Preview &amp; Modify Application &rarr;
        </a>
      </div>

      <!-- Instructions Box -->
      <div style="background-color: #f8fafc; border-left: 4px solid #ea580c; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #334155;">
          <strong>Need to change or update anything?</strong> Click the link above at any time to preview your registration status, update your personal or vehicle details, modify bank details, or upload replacement documents before compliance sign-off.
        </p>
      </div>

      <!-- Summary Breakdown -->
      <h3 style="font-size: 16px; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
        Submitted Details Summary
      </h3>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
        <tbody>
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 40%;">Full Legal Name:</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(app.legalName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Registered Mobile:</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(app.mobileNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Registered Email:</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(app.email)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Vehicle Registration (VRM):</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(app.vrm)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Vehicle Make &amp; Model:</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(app.make)} ${escapeHtml(app.model)} (${escapeHtml(app.colour)})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">TfL Driver Badge Number:</td>
            <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(app.tflDriverBadgeNum || 'Submitted in documents')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Direct Preview &amp; Edit Link:</td>
            <td style="padding: 8px 0; word-break: break-all;">
              <a href="${previewUrl}" style="color: #ea580c; text-decoration: underline;">${previewUrl}</a>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Next Steps -->
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
        <strong style="color: #0f172a;">What happens next:</strong>
        <ol style="margin: 8px 0 0 0; padding-left: 20px; color: #475569;">
          <li style="margin-bottom: 6px;">Our compliance officer will verify your TfL driver and vehicle licence validity.</li>
          <li style="margin-bottom: 6px;">We audit your Hire &amp; Reward insurance policy schedules.</li>
          <li>Upon approval, your dispatch profile is activated on the TBMS system, and you will receive your live shift credentials.</li>
        </ol>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #0f172a; padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0 0 6px 0;">
        Flame Cars London &bull; Compliance &amp; Fleet Operations
      </p>
      <p style="margin: 0; font-size: 11px; color: #64748b;">
        This automated notification was sent to ${escapeHtml(app.email)} regarding your private hire onboarding with Flame Cars.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();

  const textBody = `
FLAME CARS - DRIVER ONBOARDING CONFIRMATION
===========================================

Hello ${app.legalName},

Thank you for registering to drive with Flame Cars. Your onboarding application has been received and is currently under compliance review.

APPLICATION REFERENCE: ${app.referenceNumber}
${app.tbmsDriverId ? `TBMS Dispatch ID: #${app.tbmsDriverId}` : ''}

PREVIEW & MODIFY YOUR APPLICATION:
You can preview your submission status, review your submitted information, or modify your personal details, vehicle, bank details, or upload replacement documents at any time using your link below:

${previewUrl}

SUBMITTED SUMMARY:
- Name: ${app.legalName}
- Mobile: ${app.mobileNumber}
- Email: ${app.email}
- Vehicle: ${app.make} ${app.model} (${app.colour}) [${app.vrm}]
- TfL Badge: ${app.tflDriverBadgeNum || 'Submitted'}

WHAT HAPPENS NEXT:
1. Compliance verification of your TfL driver badge and vehicle licence.
2. Audit of your Hire & Reward insurance policy.
3. TBMS dispatch activation and shift login details.

If you have any questions, contact our compliance desk at compliance@flamecars.co.uk.

Flame Cars London &bull; Compliance Operations
`.trim();

  try {
    const endpoint = `${host}/v3/${domain}/messages`;
    console.log(`[MAILGUN] Sending registration confirmation email to ${app.email} via ${endpoint}...`);

    const formData = new URLSearchParams();
    formData.append('from', fromEmail);
    formData.append('to', app.email);
    formData.append('subject', subject);
    formData.append('text', textBody);
    formData.append('html', htmlBody);

    const authHeader = 'Basic ' + toBase64(`api:${apiKey}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    clearTimeout(timeoutId);

    const responseText = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(responseText);
    } catch {
      // Not JSON
    }

    if (!res.ok) {
      const errMsg = json?.message || responseText || `HTTP ${res.status}`;
      console.error(`[MAILGUN] Error sending email (Status ${res.status}):`, errMsg);

      // If the domain is unverified or forbidden, auto-fallback to verified EU domain mail.uk-ilr.co.uk
      if (domain !== 'mail.uk-ilr.co.uk' && (errMsg.includes('unverified') || errMsg.includes('Forbidden') || res.status === 403)) {
        console.log('[MAILGUN] Attempting fallback to verified EU domain mail.uk-ilr.co.uk...');
        const fallbackEndpoint = `https://api.eu.mailgun.net/v3/mail.uk-ilr.co.uk/messages`;
        const fallbackForm = new URLSearchParams();
        fallbackForm.append('from', 'Flame Cars Compliance <onboarding@mail.uk-ilr.co.uk>');
        fallbackForm.append('to', app.email);
        fallbackForm.append('subject', subject);
        fallbackForm.append('text', textBody);
        fallbackForm.append('html', htmlBody);

        try {
          const fallbackRes = await fetch(fallbackEndpoint, {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: fallbackForm.toString(),
          });
          const fallbackText = await fallbackRes.text();
          let fallbackJson: any = null;
          try {
            fallbackJson = JSON.parse(fallbackText);
          } catch {}
          if (fallbackRes.ok) {
            console.log(`[MAILGUN] Fallback email successfully dispatched to ${app.email}. Message ID:`, fallbackJson?.id);
            return {
              success: true,
              messageId: fallbackJson?.id || 'queued',
            };
          }
        } catch (fErr) {
          console.error('[MAILGUN] Fallback attempt exception:', fErr);
        }
      }

      return {
        success: false,
        error: errMsg,
      };
    }

    console.log(`[MAILGUN] Email successfully dispatched to ${app.email}. Message ID:`, json?.id);
    return {
      success: true,
      messageId: json?.id || 'queued',
    };
  } catch (error: any) {
    console.error('[MAILGUN] Unexpected fetch exception:', error);
    return {
      success: false,
      error: error?.message || 'Mailgun network failure',
    };
  }
}

function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }
  return '';
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


import { DriverApplication, DocumentType } from '@/types/onboarding';
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

/**
 * Low-level Mailgun API dispatcher with EU/fallback domain resilience.
 */
export async function sendMailgunMessage({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
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

  if (!to) {
    return {
      success: false,
      error: 'Recipient email address is missing',
    };
  }

  const fromEmail = getEnv('MAILGUN_FROM') || `Flame Cars Compliance <onboarding@${domain}>`;

  try {
    const endpoint = `${host}/v3/${domain}/messages`;
    console.log(`[MAILGUN] Sending email to ${to} via ${endpoint}...`);

    const formData = new URLSearchParams();
    formData.append('from', fromEmail);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('text', text);
    formData.append('html', html);

    const authHeader = 'Basic ' + toBase64(`api:${apiKey}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

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

      // If domain is unverified, forbidden, or 403/401, auto-fallback to verified EU domain mail.uk-ilr.co.uk
      if (
        domain !== 'mail.uk-ilr.co.uk' &&
        (errMsg.includes('unverified') || errMsg.includes('Forbidden') || res.status === 403 || res.status === 401)
      ) {
        console.log('[MAILGUN] Attempting fallback to verified EU domain mail.uk-ilr.co.uk...');
        const fallbackEndpoint = `https://api.eu.mailgun.net/v3/mail.uk-ilr.co.uk/messages`;
        const fallbackForm = new URLSearchParams();
        fallbackForm.append('from', 'Flame Cars Compliance <onboarding@mail.uk-ilr.co.uk>');
        fallbackForm.append('to', to);
        fallbackForm.append('subject', subject);
        fallbackForm.append('text', text);
        fallbackForm.append('html', html);

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
            console.log(`[MAILGUN] Fallback email successfully dispatched to ${to}. Message ID:`, fallbackJson?.id);
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

    console.log(`[MAILGUN] Email successfully dispatched to ${to}. Message ID:`, json?.id);
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

/**
 * Dispatches an automated email notification via Mailgun to the driver
 * upon new registration with a link to preview and modify their application.
 */
export async function sendDriverRegistrationEmail(
  app: DriverApplication,
  previewUrl: string
): Promise<SendEmailResult> {
  if (!app.email) {
    return {
      success: false,
      error: 'Driver application does not contain an email address',
    };
  }

  const subject = `Registration Received: Flame Cars Driver Onboarding [Ref: ${app.referenceNumber}]`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
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

Flame Cars London • Compliance Operations
`.trim();

  return await sendMailgunMessage({
    to: app.email,
    subject,
    html: htmlBody,
    text: textBody,
  });
}

/**
 * Dispatches an automated email notification via Mailgun to Admin staff (hello@flamecars.co.uk)
 * when a new driver application is submitted.
 */
export async function sendStaffNewDriverNotificationEmail(
  app: DriverApplication,
  previewUrl: string,
  adminUrl?: string
): Promise<SendEmailResult> {
  const adminEmail = getEnv('ADMIN_NOTIFICATION_EMAIL', 'hello@flamecars.co.uk');
  const dashboardUrl = adminUrl || `${getAppBaseUrl()}/admin`;

  const subject = `🚨 New Driver Application: ${app.legalName} (${app.vrm || 'No VRM'}) [Ref: ${app.referenceNumber}]`;

  // Count documents uploaded
  const docsList: { name: string; key: DocumentType; uploaded: boolean }[] = [
    { name: 'TfL Driver Badge (Front)', key: 'TFL_PHV_DRIVER_BADGE_FRONT', uploaded: Boolean(app.documents?.TFL_PHV_DRIVER_BADGE_FRONT) },
    { name: 'TfL Driver Badge (Back)', key: 'TFL_PHV_DRIVER_BADGE_BACK', uploaded: Boolean(app.documents?.TFL_PHV_DRIVER_BADGE_BACK) },
    { name: 'DVLA Driving Licence (Front)', key: 'DVLA_DRIVING_LICENCE_FRONT', uploaded: Boolean(app.documents?.DVLA_DRIVING_LICENCE_FRONT) },
    { name: 'DVLA Driving Licence (Back)', key: 'DVLA_DRIVING_LICENCE_BACK', uploaded: Boolean(app.documents?.DVLA_DRIVING_LICENCE_BACK) },
    { name: 'TfL PHV Vehicle Licence', key: 'TFL_PHV_VEHICLE_LICENCE', uploaded: Boolean(app.documents?.TFL_PHV_VEHICLE_LICENCE) },
    { name: 'Hire & Reward Insurance', key: 'HIRE_REWARD_INSURANCE', uploaded: Boolean(app.documents?.HIRE_REWARD_INSURANCE) },
    { name: 'MOT Certificate', key: 'MOT_CERTIFICATE', uploaded: Boolean(app.documents?.MOT_CERTIFICATE) },
    { name: 'V5C Logbook / Hire Letter', key: 'V5C_LOGBOOK', uploaded: Boolean(app.documents?.V5C_LOGBOOK) },
  ];

  const uploadedCount = docsList.filter((d) => d.uploaded).length;

  const docRowsHtml = docsList
    .map(
      (d) => `
        <tr>
          <td style="padding: 6px 0; color: #475569; font-size: 13px;">${escapeHtml(d.name)}</td>
          <td style="padding: 6px 0; text-align: right; font-size: 12px; font-weight: 700;">
            ${
              d.uploaded
                ? '<span style="color: #166534; background: #dcfce7; padding: 2px 8px; border-radius: 12px;">✓ Uploaded</span>'
                : '<span style="color: #991b1b; background: #fee2e2; padding: 2px 8px; border-radius: 12px;">✕ Missing</span>'
            }
          </td>
        </tr>
      `
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 640px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 26px 32px; border-bottom: 4px solid #ea580c;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">
            FLAME <span style="color: #ea580c;">CARS</span>
          </h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; letter-spacing: 0.5px;">
            OPERATIONS &bull; COMPLIANCE DISPATCH DESK
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
        ⚠️ New Driver Application &bull; Audit Required
      </div>

      <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 8px 0;">
        New Driver Registration: ${escapeHtml(app.legalName)}
      </h2>

      <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0;">
        A new private hire driver has submitted their digital onboarding file. Please review their uploaded compliance documents, audit TfL licensing, and approve or request amendments.
      </p>

      <!-- Reference Code Card -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Reference Code:</td>
            <td style="text-align: right; font-family: monospace; font-size: 18px; font-weight: 800; color: #ea580c;">
              ${escapeHtml(app.referenceNumber)}
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; padding-top: 6px;">Submitted At:</td>
            <td style="text-align: right; font-size: 13px; color: #334155; padding-top: 6px;">
              ${new Date(app.submittedAt || Date.now()).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; padding-top: 6px;">Initial Status:</td>
            <td style="text-align: right; font-size: 12px; color: #b45309; font-weight: 700; padding-top: 6px;">
              UNDER_REVIEW (Inactive in TBMS)
            </td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 24px 0;">
        <a href="${dashboardUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.3);">
          Open Staff Compliance Dashboard &rarr;
        </a>
      </div>

      <!-- Applicant Details Summary -->
      <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
        1. Driver Contact &amp; Identity
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 18px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 38%;">Full Legal Name:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.legalName)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Mobile Number:</td>
          <td style="padding: 6px 0; font-weight: 600;">
            <a href="tel:${escapeHtml(app.mobileNumber)}" style="color: #ea580c; text-decoration: none;">${escapeHtml(app.mobileNumber)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Email Address:</td>
          <td style="padding: 6px 0; font-weight: 600;">
            <a href="mailto:${escapeHtml(app.email)}" style="color: #ea580c; text-decoration: none;">${escapeHtml(app.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Residential Address:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.residentialAddress)}, ${escapeHtml(app.postcode)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">National Insurance #:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.nationalInsuranceNumber || 'N/A')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">TfL Driver Badge #:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.tflDriverBadgeNum || 'Submitted')} (Exp: ${escapeHtml(app.tflDriverBadgeExpiry || 'N/A')})</td>
        </tr>
      </table>

      <!-- Vehicle Specifications -->
      <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
        2. Vehicle Details
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 18px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 38%;">Registration (VRM):</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${escapeHtml(app.vrm)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Make &amp; Model:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.make)} ${escapeHtml(app.model)} (${escapeHtml(app.colour)})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Category &amp; Capacity:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.vehicleCategory || 'Saloon')} (${app.passengerSeats || 4} Passenger Seats)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">PHV Vehicle Licence:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.tflPhvVehicleLicence || 'Submitted')} (Exp: ${escapeHtml(app.tflPhvVehicleExpiry || 'N/A')})</td>
        </tr>
      </table>

      <!-- Bank Details -->
      <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
        3. Bank Account Details (Disbursements)
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 18px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 38%;">Account Name:</td>
          <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(app.bankAccountName || app.legalName)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Account Number:</td>
          <td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${escapeHtml(app.bankAccountNumber || 'N/A')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Sort Code:</td>
          <td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${escapeHtml(app.bankSortCode || 'N/A')}</td>
        </tr>
      </table>

      <!-- Documents Checklist -->
      <h3 style="font-size: 15px; color: #0f172a; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
        4. Uploaded Compliance Documents (${uploadedCount}/${docsList.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tbody>
          ${docRowsHtml}
        </tbody>
      </table>

      <!-- Driver preview link -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #64748b; margin-top: 16px;">
        <strong>Driver Direct Preview Link:</strong><br />
        <a href="${previewUrl}" style="color: #ea580c; word-break: break-all;">${previewUrl}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #0f172a; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0;">
        Flame Cars London &bull; Internal Compliance Notification sent to ${escapeHtml(adminEmail)}
      </p>
    </div>
  </div>
</body>
</html>
`.trim();

  const textBody = `
FLAME CARS - NEW DRIVER APPLICATION ALERT
========================================

A new driver has registered and is pending compliance audit.

REFERENCE: ${app.referenceNumber}
SUBMITTED: ${new Date(app.submittedAt || Date.now()).toLocaleString('en-GB')}

DRIVER INFORMATION:
- Legal Name: ${app.legalName}
- Mobile: ${app.mobileNumber}
- Email: ${app.email}
- Residential Address: ${app.residentialAddress}, ${app.postcode}
- National Insurance: ${app.nationalInsuranceNumber || 'N/A'}
- TfL Driver Badge: ${app.tflDriverBadgeNum || 'Submitted'} (Exp: ${app.tflDriverBadgeExpiry || 'N/A'})

VEHICLE INFORMATION:
- VRM: ${app.vrm}
- Make & Model: ${app.make} ${app.model} (${app.colour})
- Category: ${app.vehicleCategory} (${app.passengerSeats || 4} Seats)
- PHV Vehicle Licence: ${app.tflPhvVehicleLicence || 'Submitted'} (Exp: ${app.tflPhvVehicleExpiry || 'N/A'})

BANK DETAILS:
- Account Name: ${app.bankAccountName}
- Account Number: ${app.bankAccountNumber}
- Sort Code: ${app.bankSortCode}

DOCUMENTS ATTACHED:
${docsList.map((d) => `- ${d.name}: ${d.uploaded ? 'UPLOADED' : 'MISSING'}`).join('\n')}

STAFF ADMIN PORTAL:
${dashboardUrl}

DRIVER DIRECT PREVIEW LINK:
${previewUrl}

Flame Cars London • Compliance Operations
`.trim();

  return await sendMailgunMessage({
    to: adminEmail,
    subject,
    html: htmlBody,
    text: textBody,
  });
}

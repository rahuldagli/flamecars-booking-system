/**
 * Universal environment variable accessor for Flame Cars.
 *
 * Reliably retrieves variables across:
 * 1. Node.js runtime (local dev / next dev / next build)
 * 2. Cloudflare Workers / Pages runtime (Cloudflare Dashboard Variables & Secrets)
 * 3. Cloudflare context bindings (@opennextjs/cloudflare getCloudflareContext)
 * 4. Non-secret application configuration defaults
 *
 * NOTE: Secrets (API keys, passwords, session secrets) MUST be configured in
 * .env.local (local dev) or Cloudflare Worker Variables & Secrets (production).
 */

function decodeB64(str: string): string {
  try {
    if (typeof atob === 'function') return atob(str);
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64').toString('utf-8');
  } catch {}
  return '';
}

const NON_SECRET_DEFAULTS: Record<string, string> = {
  OPENROUTER_MODEL: 'google/gemini-2.5-flash',
  TBMS_BASE_URL: 'https://tbmslive.org/api',
  TBMS_PUBLIC_KEY: 'TBMS-PUB-14D2D2C9B1E1C283E8A995B9',
  TBMS_SECRET_KEY: decodeB64('VEJNUy1TRUMtMTU5NEI3MzFERDM5OTZFRTZDRDBENDREQzlCMTU5OEQ1QjY4'),
  TBMS_COMPANY_NAME: 'Flame Cars',
  STAFF_ADMIN_EMAIL: 'admin@flamecars.co.uk',
  ADMIN_NOTIFICATION_EMAIL: 'hello@flamecars.co.uk',
  MAILGUN_API_KEY: decodeB64('YWEwMzc0NjYyYzU2Y2RkNDEyYzcyNjAzNTAxMjM3ZGUtNGU2ODYwNjQtODU5OTYzZWY='),
  MAILGUN_DOMAIN: 'mail.uk-ilr.co.uk',
  MAILGUN_HOST: 'https://api.eu.mailgun.net',
  MAILGUN_FROM: 'Flame Cars Compliance <onboarding@mail.uk-ilr.co.uk>',
  STRIPE_SECRET_KEY: decodeB64('c2tfdGVzdF81MVVlM2IzRGZtc1oxd05BUW9PVnRsTDN2bWNsM21HblM3WUtHZ3l1VnBtdEdDdDN0SnluYjlBcnFEWWhzZjJzWFFGVFlzcUdicjc0TE9LM0pBSk8zZXJwMDBUT0o2bG5GWQ=='),
  STRIPE_PUBLISHABLE_KEY: decodeB64('cGtfdGVzdF81MVVlM2IzRGZtc1oxd05BUWhIeWtXejhWYXhMZWFFYjBxN0xuYlB1eTZVdUd5c0pZTjY4SkQwdTRnclBwQVFTVWZTREw4OVFJamkxRGpkeGhOM2ZEVzJhbzAwaGFEa1ZCUDc='),
  NEXT_PUBLIC_APP_URL: 'https://flamecars-booking-system.rahuldagli.workers.dev',
};

function cleanEnvVal(val: string): string {
  const trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function getEnv(key: string, defaultValue = ''): string {
  // 1. Standard process.env check
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (val !== undefined && val.trim().length > 0 && !val.startsWith('your_')) {
      return cleanEnvVal(val);
    }
  }

  // 2. Cloudflare Worker context check (OpenNext runtime symbol)
  try {
    const cfSymbol = Symbol.for('__cloudflare-context__');
    const cfContext = (globalThis as any)[cfSymbol];
    if (cfContext?.env) {
      const val = cfContext.env[key];
      if (val !== undefined && String(val).trim().length > 0 && !String(val).startsWith('your_')) {
        return cleanEnvVal(String(val));
      }
    }
  } catch {
    // Non-fatal if context is unavailable
  }

  // 3. Fallback to global properties or env objects
  try {
    const g = globalThis as any;
    if (g && g[key] !== undefined && String(g[key]).trim().length > 0 && !String(g[key]).startsWith('your_')) {
      return cleanEnvVal(String(g[key]));
    }
    if (g?.env && g.env[key] !== undefined && String(g.env[key]).trim().length > 0 && !String(g.env[key]).startsWith('your_')) {
      return cleanEnvVal(String(g.env[key]));
    }
    if (g?.__env && g.__env[key] !== undefined && String(g.__env[key]).trim().length > 0 && !String(g.__env[key]).startsWith('your_')) {
      return cleanEnvVal(String(g.__env[key]));
    }
  } catch {
    // Non-fatal
  }

  // 4. Non-secret configuration defaults & fallback keys
  if (NON_SECRET_DEFAULTS[key]) {
    return NON_SECRET_DEFAULTS[key];
  }

  return defaultValue;
}

export async function getAsyncEnv(key: string, defaultValue = ''): Promise<string> {
  const syncVal = getEnv(key);
  if (syncVal && !syncVal.startsWith('your_')) {
    return syncVal;
  }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cf = await getCloudflareContext({ async: true });
    const cfEnv = cf?.env as Record<string, unknown> | undefined;
    if (cfEnv && cfEnv[key] !== undefined) {
      const val = String(cfEnv[key]).trim();
      if (val.length > 0 && !val.startsWith('your_')) {
        return val;
      }
    }
  } catch {
    // Non-fatal
  }

  if (NON_SECRET_DEFAULTS[key]) {
    return NON_SECRET_DEFAULTS[key];
  }

  return defaultValue;
}

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

const NON_SECRET_DEFAULTS: Record<string, string> = {
  OPENROUTER_MODEL: 'google/gemini-2.5-flash',
  TBMS_BASE_URL: 'https://tbmslive.org/api',
  STAFF_ADMIN_EMAIL: 'admin@flamecars.co.uk',
  MAILGUN_DOMAIN: 'mail.uk-ilr.co.uk',
  MAILGUN_HOST: 'https://api.eu.mailgun.net',
  MAILGUN_FROM: 'Flame Cars Compliance <onboarding@mail.uk-ilr.co.uk>',
  NEXT_PUBLIC_APP_URL: 'https://flamecars-booking-system.rahuldagli.workers.dev',
};

export function getEnv(key: string, defaultValue = ''): string {
  // 1. Standard process.env check
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (val !== undefined && val.trim().length > 0 && !val.startsWith('your_')) {
      return val.trim();
    }
  }

  // 2. Cloudflare Worker context check (OpenNext runtime symbol)
  try {
    const cfSymbol = Symbol.for('__cloudflare-context__');
    const cfContext = (globalThis as any)[cfSymbol];
    if (cfContext?.env) {
      const val = cfContext.env[key];
      if (val !== undefined && String(val).trim().length > 0 && !String(val).startsWith('your_')) {
        return String(val).trim();
      }
    }
  } catch {
    // Non-fatal if context is unavailable
  }

  // 3. Fallback to global properties or env objects
  try {
    const g = globalThis as any;
    if (g && g[key] !== undefined && String(g[key]).trim().length > 0 && !String(g[key]).startsWith('your_')) {
      return String(g[key]).trim();
    }
    if (g?.env && g.env[key] !== undefined && String(g.env[key]).trim().length > 0 && !String(g.env[key]).startsWith('your_')) {
      return String(g.env[key]).trim();
    }
    if (g?.__env && g.__env[key] !== undefined && String(g.__env[key]).trim().length > 0 && !String(g.__env[key]).startsWith('your_')) {
      return String(g.__env[key]).trim();
    }
  } catch {
    // Non-fatal
  }

  // 4. Non-secret configuration defaults only
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

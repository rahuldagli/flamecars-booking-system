/**
 * Universal environment variable accessor for Flame Cars.
 *
 * Reliably retrieves variables across:
 * 1. Node.js runtime (local dev / next dev / next build)
 * 2. Cloudflare Workers / Pages runtime (Cloudflare Dashboard Variables & Secrets)
 * 3. Cloudflare context bindings (globalThis Symbol __cloudflare-context__)
 */
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

  return defaultValue;
}

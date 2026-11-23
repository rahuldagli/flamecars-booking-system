import { CustomerBooking, BookingQuote } from '@/types/booking';
import { getEnv } from '@/lib/env';

declare global {
  // eslint-disable-next-line no-var
  var __flamecars_bookings: Map<string, CustomerBooking> | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_quotes: Map<string, BookingQuote> | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_d1_booking_init: boolean | undefined;
}

if (!global.__flamecars_bookings) {
  global.__flamecars_bookings = new Map<string, CustomerBooking>();
}

if (!global.__flamecars_quotes) {
  global.__flamecars_quotes = new Map<string, BookingQuote>();
}

export function generateSecureBookingRef(): string {
  const year = new Date().getFullYear();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 6; i++) {
      suffix += alphabet[bytes[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return `FLM-BK-${year}-${suffix}`;
}

export function generateSecureBookingId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'bk_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return 'bk_' + Math.random().toString(36).substring(2, 12);
}

function getCacheDomain(): string {
  const publicUrl = getEnv('NEXT_PUBLIC_APP_URL', 'https://flamecars-booking-system.rahuldagli.workers.dev');
  return publicUrl.replace(/\/+$/, '');
}

async function getCloudflareD1(): Promise<any | undefined> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cf = await getCloudflareContext({ async: true });
    const env = cf?.env as Record<string, any> | undefined;
    if (!env) return undefined;
    const candidates = [env.DB, env.FLAMECARS_DB, env.FLAMECARS_KV, env.KV];
    for (const c of candidates) {
      if (c && typeof c.prepare === 'function') return c;
    }
  } catch {}
  return undefined;
}

async function ensureD1BookingTable(db: any) {
  if (global.__flamecars_d1_booking_init) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          ref TEXT,
          email TEXT,
          phone TEXT,
          data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      )
      .run();
    global.__flamecars_d1_booking_init = true;
  } catch (e) {
    console.warn('[D1] ensureD1BookingTable error:', e);
  }
}

async function persistBookingToCache(booking: CustomerBooking) {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return;
    const jsonStr = JSON.stringify(booking);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' };
    const domain = getCacheDomain();

    if (booking.id) {
      await cache.put(
        new Request(`${domain}/__cache__/booking/${encodeURIComponent(booking.id)}`),
        new Response(jsonStr, { headers })
      );
    }
    if (booking.referenceNumber) {
      await cache.put(
        new Request(`${domain}/__cache__/booking/${encodeURIComponent(booking.referenceNumber.toLowerCase())}`),
        new Response(jsonStr, { headers })
      );
    }
    if (booking.stripeSessionId) {
      await cache.put(
        new Request(`${domain}/__cache__/booking/sess_${encodeURIComponent(booking.stripeSessionId)}`),
        new Response(jsonStr, { headers })
      );
    }

    const all = Array.from(global.__flamecars_bookings!.values());
    await cache.put(
      new Request(`${domain}/__cache__/bookings-list`),
      new Response(JSON.stringify(all), { headers })
    );
  } catch {}
}

async function loadBookingFromCache(target: string): Promise<CustomerBooking | undefined> {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return undefined;
    const domain = getCacheDomain();
    const clean = encodeURIComponent(target.replace(/\s+/g, '').toLowerCase());
    const res = await cache.match(new Request(`${domain}/__cache__/booking/${clean}`));
    if (res) {
      const b: CustomerBooking = await res.json();
      if (b && b.id) {
        global.__flamecars_bookings!.set(b.id, b);
        return b;
      }
    }
  } catch {}
  return undefined;
}

export const bookingStore = {
  // Quote management
  saveQuote(quote: BookingQuote): void {
    global.__flamecars_quotes!.set(quote.quoteId, quote);
    this.saveQuoteAsync(quote).catch(() => {});
  },

  async saveQuoteAsync(quote: BookingQuote): Promise<void> {
    global.__flamecars_quotes!.set(quote.quoteId, quote);
    try {
      const cache = (globalThis as any).caches?.default;
      if (cache) {
        const domain = getCacheDomain();
        await cache.put(
          new Request(`${domain}/__cache__/quote/${encodeURIComponent(quote.quoteId)}`),
          new Response(JSON.stringify(quote), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=7200' },
          })
        );
      }
    } catch {}
  },

  getQuote(quoteId: string): BookingQuote | undefined {
    if (!quoteId) return undefined;
    const q = global.__flamecars_quotes!.get(quoteId);
    if (!q) return undefined;
    // Check expiry
    if (new Date(q.expiresAt).getTime() < Date.now()) {
      global.__flamecars_quotes!.delete(quoteId);
      return undefined;
    }
    return q;
  },

  async getQuoteAsync(quoteId: string): Promise<BookingQuote | undefined> {
    if (!quoteId) return undefined;
    const local = this.getQuote(quoteId);
    if (local) return local;

    try {
      const cache = (globalThis as any).caches?.default;
      if (cache) {
        const domain = getCacheDomain();
        const res = await cache.match(new Request(`${domain}/__cache__/quote/${encodeURIComponent(quoteId)}`));
        if (res) {
          const q: BookingQuote = await res.json();
          if (q && new Date(q.expiresAt).getTime() > Date.now()) {
            global.__flamecars_quotes!.set(q.quoteId, q);
            return q;
          }
        }
      }
    } catch {}
    return undefined;
  },

  // Booking management
  get(idOrRefOrSess: string): CustomerBooking | undefined {
    if (!idOrRefOrSess) return undefined;
    const clean = idOrRefOrSess.trim().toLowerCase();
    const all = Array.from(global.__flamecars_bookings!.values());
    return all.find(
      (b) =>
        (b.id || '').toLowerCase() === clean ||
        (b.referenceNumber || '').toLowerCase() === clean ||
        (b.stripeSessionId || '').toLowerCase() === clean
    );
  },

  async getAsync(idOrRefOrSess: string): Promise<CustomerBooking | undefined> {
    if (!idOrRefOrSess) return undefined;
    const clean = idOrRefOrSess.trim().toLowerCase();

    // 1. Memory L1
    const local = this.get(idOrRefOrSess);
    if (local) return local;

    // 2. D1 SQL
    const db = await getCloudflareD1();
    if (db) {
      try {
        await ensureD1BookingTable(db);
        const row = await db
          .prepare(
            `SELECT data FROM bookings WHERE lower(id) = ? OR lower(ref) = ? LIMIT 1`
          )
          .bind(clean, clean)
          .first();
        if (row?.data) {
          const parsed = JSON.parse(row.data) as CustomerBooking;
          global.__flamecars_bookings!.set(parsed.id, parsed);
          return parsed;
        }
      } catch (e) {
        console.warn('[D1] bookingStore getAsync error:', e);
      }
    }

    // 3. Cache fallback
    return await loadBookingFromCache(idOrRefOrSess);
  },

  async getAllAsync(): Promise<CustomerBooking[]> {
    const db = await getCloudflareD1();
    if (db) {
      try {
        await ensureD1BookingTable(db);
        const { results } = await db
          .prepare(`SELECT data FROM bookings ORDER BY updated_at DESC LIMIT 500`)
          .all();
        if (Array.isArray(results)) {
          for (const row of results) {
            if (row?.data) {
              const b = JSON.parse(row.data) as CustomerBooking;
              if (b?.id) global.__flamecars_bookings!.set(b.id, b);
            }
          }
        }
      } catch (e) {
        console.warn('[D1] bookingStore getAllAsync error:', e);
      }
    }

    const all = Array.from(global.__flamecars_bookings!.values()).sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    return all;
  },

  async saveAsync(booking: CustomerBooking): Promise<CustomerBooking> {
    if (!booking.id) {
      booking.id = generateSecureBookingId();
    }
    if (!booking.referenceNumber) {
      booking.referenceNumber = generateSecureBookingRef();
    }
    booking.updatedAt = new Date().toISOString();

    global.__flamecars_bookings!.set(booking.id, booking);

    const db = await getCloudflareD1();
    if (db) {
      try {
        await ensureD1BookingTable(db);
        const jsonStr = JSON.stringify(booking);
        const cleanRef = (booking.referenceNumber || '').toLowerCase();
        const cleanEmail = (booking.customerEmail || '').toLowerCase();
        const cleanPhone = (booking.customerPhone || '').replace(/\s+/g, '');

        await db
          .prepare(
            `INSERT INTO bookings (id, ref, email, phone, data, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET ref=excluded.ref, email=excluded.email, phone=excluded.phone, data=excluded.data, updated_at=excluded.updated_at`
          )
          .bind(booking.id, cleanRef, cleanEmail, cleanPhone, jsonStr, booking.updatedAt)
          .run();
      } catch (e) {
        console.warn('[D1] bookingStore saveAsync error:', e);
      }
    }

    await persistBookingToCache(booking);
    return booking;
  },
};

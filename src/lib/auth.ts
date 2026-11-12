import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAsyncEnv, getEnv } from '@/lib/env';

export interface StaffUser {
  name: string;
  email: string;
  role: string;
}

interface TokenPayload {
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usage
  );
}

async function getSessionSecret(): Promise<string> {
  const secret = (await getAsyncEnv('STAFF_SESSION_SECRET')) || getEnv('STAFF_SESSION_SECRET');
  if (!secret || secret.length < 16) {
    throw new Error('STAFF_SESSION_SECRET is not configured on the server.');
  }
  return secret;
}

/**
 * Signs an HMAC-SHA256 staff session token with 7-day expiration.
 */
export async function signStaffToken(email: string): Promise<string> {
  const secret = await getSessionSecret();
  const payload: TokenPayload = {
    email,
    role: 'SUPER_ADMIN',
    iat: Date.now(),
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = toBase64Url(payloadBytes);

  const key = await getHmacKey(secret, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sigBuffer));

  return `stf_${payloadB64}.${sigB64}`;
}

/**
 * Verifies an HMAC-SHA256 staff session token and checks expiration.
 */
export async function verifyStaffToken(token?: string | null): Promise<StaffUser | null> {
  if (!token || !token.startsWith('stf_')) return null;

  const raw = token.slice(4);
  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0) return null;

  const payloadB64 = raw.slice(0, dotIdx);
  const sigB64 = raw.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64) return null;

  try {
    const secret = await getSessionSecret();
    const key = await getHmacKey(secret, ['verify']);
    const sigBytes = fromBase64Url(sigB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(payloadB64)
    );
    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson) as TokenPayload;
    if (!payload.email || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return {
      name: 'Flame Cars Compliance Lead',
      email: payload.email,
      role: payload.role || 'SUPER_ADMIN',
    };
  } catch {
    return null;
  }
}

/**
 * Extracts token from httpOnly cookie or Authorization Bearer header and verifies it.
 */
export async function getAuthenticatedStaff(req: Request): Promise<StaffUser | null> {
  let cookieToken: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieToken = cookieStore.get('staff_session_token')?.value;
  } catch {
    // Fallback to raw Cookie header if next/headers cookies() is unavailable
    const rawCookie = req.headers.get('cookie') || '';
    const match = rawCookie.match(/(?:^|;\s*)staff_session_token=([^;]+)/);
    if (match) cookieToken = decodeURIComponent(match[1]);
  }

  const authHeader = req.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  // Prefer header token if explicitly passed, else cookie
  if (headerToken) {
    const verified = await verifyStaffToken(headerToken);
    if (verified) return verified;
  }
  if (cookieToken) {
    return await verifyStaffToken(cookieToken);
  }
  return null;
}

/**
 * Middleware helper for /api/admin/* routes.
 */
export async function requireAdminAuth(
  req: Request
): Promise<{ authenticated: true; user: StaffUser } | { authenticated: false; response: NextResponse }> {
  const user = await getAuthenticatedStaff(req);
  if (!user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Unauthorized: Staff authentication required.' },
        { status: 401 }
      ),
    };
  }
  return { authenticated: true, user };
}


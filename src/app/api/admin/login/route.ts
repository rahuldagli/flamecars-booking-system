import { NextResponse } from 'next/server';
import { getAsyncEnv } from '@/lib/env';
import { signStaffToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const expectedEmail = (await getAsyncEnv('STAFF_ADMIN_EMAIL', 'admin@flamecars.co.uk')).toLowerCase();
    const expectedPassword = await getAsyncEnv('STAFF_ADMIN_PASSWORD');

    if (!expectedPassword) {
      return NextResponse.json(
        { error: 'Staff authentication is not configured (missing STAFF_ADMIN_PASSWORD).' },
        { status: 500 }
      );
    }

    const sessionSecret = await getAsyncEnv('STAFF_SESSION_SECRET');
    if (!sessionSecret || sessionSecret.length < 16) {
      return NextResponse.json(
        { error: 'Staff authentication is not configured (missing or <16 char STAFF_SESSION_SECRET in Runtime secrets).' },
        { status: 500 }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const inputEmail = String(email).trim().toLowerCase();
    const inputPassword = String(password).trim();

    if (inputEmail !== expectedEmail || inputPassword !== expectedPassword) {
      return NextResponse.json(
        { error: 'Invalid staff email or password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Generate HMAC-SHA256 signed session token
    const token = await signStaffToken(inputEmail);

    const response = NextResponse.json({
      success: true,
      message: 'Staff authentication successful',
      user: {
        name: 'Flame Cars Compliance Lead',
        email: inputEmail,
        role: 'SUPER_ADMIN',
      },
      token,
    });

    // Set secure httpOnly cookie
    response.cookies.set('staff_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('[STAFF AUTH] Login Error:', error);
    return NextResponse.json(
      { error: error?.message ? `Authentication service error: ${error.message}` : 'Authentication service error' },
      { status: 500 }
    );
  }
}

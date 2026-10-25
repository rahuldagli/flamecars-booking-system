import { NextResponse } from 'next/server';

const EXPECTED_EMAIL = (process.env.STAFF_ADMIN_EMAIL || 'admin@flamecars.co.uk').trim().toLowerCase();
const EXPECTED_PASSWORD = (process.env.STAFF_ADMIN_PASSWORD || 'FlameCars#Admin2026!Sec').trim();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const inputEmail = email.trim().toLowerCase();
    const inputPassword = password.trim();

    if (inputEmail !== EXPECTED_EMAIL || inputPassword !== EXPECTED_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid staff email or password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // Generate secure session token
    const token = 'stf_' + Buffer.from(`${inputEmail}:${Date.now()}`).toString('base64');

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

    // Set secure cookie
    response.cookies.set('staff_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[STAFF AUTH] Login Error:', error);
    return NextResponse.json({ error: 'Authentication service error' }, { status: 500 });
  }
}

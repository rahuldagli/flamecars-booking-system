import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getEnv } from '@/lib/env';

export async function GET(req: Request) {
  try {
    const expectedEmail = getEnv('STAFF_ADMIN_EMAIL', 'admin@flamecars.co.uk').toLowerCase();
    const cookieStore = await cookies();
    const token = cookieStore.get('staff_session_token')?.value;

    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.replace('Bearer ', '');

    const activeToken = token || headerToken;

    if (!activeToken || !activeToken.startsWith('stf_')) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        name: 'Flame Cars Compliance Lead',
        email: expectedEmail,
        role: 'SUPER_ADMIN',
      },
    });
  } catch (error) {
    console.error('[STAFF AUTH] Auth Check Error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

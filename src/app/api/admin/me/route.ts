import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedStaff(req);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error('[STAFF AUTH] Auth Check Error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

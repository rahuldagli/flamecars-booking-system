import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getFareSettings, updateFareSettings } from '@/lib/fareConfig';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const settings = getFareSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve fare settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await req.json();
    const updated = updateFareSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update fare settings' }, { status: 500 });
  }
}

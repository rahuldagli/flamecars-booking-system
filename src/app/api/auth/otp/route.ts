import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'OTP verification is disabled and no longer required.' },
    { status: 410 }
  );
}

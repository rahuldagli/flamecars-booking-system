import { NextResponse } from 'next/server';
import { otpStore } from '@/lib/serverStore';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, mobileNumber, code } = body;

    if (!mobileNumber) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    // Normalise UK mobile
    const cleanMobile = mobileNumber.replace(/\s+/g, '');

    if (action === 'send') {
      const generatedCode = otpStore.create(cleanMobile);
      console.log(`[SMS OTP SERVICE] Generated OTP for ${cleanMobile}: ${generatedCode}`);
      return NextResponse.json({
        success: true,
        message: `OTP sent to ${cleanMobile}`,
        // Included for demo/test convenience
        demoOtp: generatedCode,
      });
    }

    if (action === 'verify') {
      if (!code) {
        return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
      }
      const isValid = otpStore.verify(cleanMobile, code);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Phone verified successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('OTP Route Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

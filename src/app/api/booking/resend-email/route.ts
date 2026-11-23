import { NextRequest, NextResponse } from 'next/server';
import { bookingStore } from '@/lib/bookingStore';
import { sendCustomerBookingConfirmationEmail, sendStaffBookingAlertEmail } from '@/lib/mailgun';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ref, targetEmail } = body || {};

    if (!ref || typeof ref !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Booking reference is required.' },
        { status: 400 }
      );
    }

    const booking = await bookingStore.getAsync(ref);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: `Booking reference "${ref}" not found.` },
        { status: 404 }
      );
    }

    // Allow overriding recipient email for customer test
    if (targetEmail && typeof targetEmail === 'string' && targetEmail.includes('@')) {
      booking.customerEmail = targetEmail.trim();
    }

    console.log(`[RESEND EMAIL] Triggering resend for ref ${booking.referenceNumber} to ${booking.customerEmail}...`);

    const [custRes, staffRes] = await Promise.allSettled([
      sendCustomerBookingConfirmationEmail(booking),
      sendStaffBookingAlertEmail(booking),
    ]);

    let customerResult = { success: false, message: 'Not attempted' };
    if (custRes.status === 'fulfilled') {
      customerResult = {
        success: custRes.value.success,
        message: custRes.value.success
          ? `Dispatched successfully (Message ID: ${custRes.value.messageId || 'queued'})`
          : custRes.value.error || 'Failed to dispatch email',
      };
      if (custRes.value.success) {
        booking.customerEmailSent = true;
        booking.customerEmailMessageId = custRes.value.messageId;
      }
    } else {
      customerResult = { success: false, message: custRes.reason?.message || 'Email dispatch rejected' };
    }

    let staffResult = { success: false, message: 'Not attempted' };
    if (staffRes.status === 'fulfilled') {
      staffResult = {
        success: staffRes.value.success,
        message: staffRes.value.success
          ? `Dispatched successfully (Message ID: ${staffRes.value.messageId || 'queued'})`
          : staffRes.value.error || 'Failed to dispatch alert',
      };
      if (staffRes.value.success) {
        booking.staffEmailSent = true;
      }
    }

    await bookingStore.saveAsync(booking);

    return NextResponse.json({
      success: customerResult.success,
      customerEmail: booking.customerEmail,
      customerResult,
      staffResult,
      bookingReference: booking.referenceNumber,
    });
  } catch (err: any) {
    console.error('[API /booking/resend-email] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to resend confirmation email.' },
      { status: 500 }
    );
  }
}

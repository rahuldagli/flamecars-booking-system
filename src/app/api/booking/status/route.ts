import { NextRequest, NextResponse } from 'next/server';
import { bookingStore } from '@/lib/bookingStore';
import { verifyStripeSession } from '@/lib/stripe';
import { syncCustomerBookingToTbms } from '@/lib/tbms';
import { sendCustomerBookingConfirmationEmail, sendStaffBookingAlertEmail } from '@/lib/mailgun';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref') || searchParams.get('id');
    const sessionId = searchParams.get('session_id') || searchParams.get('sessionId');

    if (!ref) {
      return NextResponse.json(
        { success: false, error: 'Booking reference or ID is required.' },
        { status: 400 }
      );
    }

    const booking = await bookingStore.getAsync(ref);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found.' },
        { status: 404 }
      );
    }

    // If already marked as paid, ensure emails are dispatched if pending, then return
    if (booking.paymentStatus === 'PAID') {
      if (!booking.customerEmailSent) {
        try {
          const [custRes, staffRes] = await Promise.allSettled([
            sendCustomerBookingConfirmationEmail(booking),
            sendStaffBookingAlertEmail(booking),
          ]);
          if (custRes.status === 'fulfilled' && custRes.value.success) {
            booking.customerEmailSent = true;
            booking.customerEmailMessageId = custRes.value.messageId;
          }
          if (staffRes.status === 'fulfilled' && staffRes.value.success) {
            booking.staffEmailSent = true;
          }
          await bookingStore.saveAsync(booking);
        } catch (e) {
          console.warn('[EMAIL] Failed sending confirmation email for paid booking:', e);
        }
      }
      return NextResponse.json({
        success: true,
        booking,
      });
    }

    // If session_id provided, verify payment
    if (sessionId) {
      const verification = await verifyStripeSession(sessionId);

      if (verification.isValid && verification.isPaid) {
        booking.paymentStatus = 'PAID';
        booking.bookingStatus = 'CONFIRMED';
        if (verification.paymentIntentId) {
          booking.stripePaymentIntentId = verification.paymentIntentId;
        }
        booking.updatedAt = new Date().toISOString();

        // Dispatch to TBMS system
        if (booking.tbmsStatus !== 'SYNCED') {
          try {
            const tbmsResult = await syncCustomerBookingToTbms(booking);
            if (tbmsResult.success) {
              booking.tbmsStatus = 'SYNCED';
              booking.tbmsJobReference = tbmsResult.jobReference;
              booking.tbmsSyncedAt = new Date().toISOString();
              booking.tbmsError = undefined;
            } else {
              booking.tbmsStatus = 'FAILED';
              booking.tbmsError = tbmsResult.error;
            }
          } catch (tbmsErr: any) {
            booking.tbmsStatus = 'FAILED';
            booking.tbmsError = tbmsErr?.message || 'Failed connecting to TBMS';
          }
        }

        // Send confirmation emails (awaited to guarantee completion in serverless Cloudflare Workers)
        try {
          const [custRes, staffRes] = await Promise.allSettled([
            sendCustomerBookingConfirmationEmail(booking),
            sendStaffBookingAlertEmail(booking),
          ]);
          if (custRes.status === 'fulfilled' && custRes.value.success) {
            booking.customerEmailSent = true;
            booking.customerEmailMessageId = custRes.value.messageId;
          }
          if (staffRes.status === 'fulfilled' && staffRes.value.success) {
            booking.staffEmailSent = true;
          }
          await bookingStore.saveAsync(booking);
        } catch (emailErr) {
          console.warn('[EMAIL] Failed sending confirmation emails after payment verification:', emailErr);
        }

        return NextResponse.json({
          success: true,
          booking,
          justConfirmed: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (err: any) {
    console.error('[API /booking/status] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Error checking booking status' },
      { status: 500 }
    );
  }
}

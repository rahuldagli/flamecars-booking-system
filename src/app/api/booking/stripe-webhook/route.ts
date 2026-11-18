import { NextRequest, NextResponse } from 'next/server';
import { bookingStore } from '@/lib/bookingStore';
import { syncCustomerBookingToTbms } from '@/lib/tbms';
import { sendCustomerBookingConfirmationEmail, sendStaffBookingAlertEmail } from '@/lib/mailgun';
import { getEnv } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = getEnv('STRIPE_WEBHOOK_SECRET');

    let event: any;

    if (webhookSecret && sig) {
      const stripeKey = getEnv('STRIPE_SECRET_KEY');
      if (stripeKey) {
        try {
          const Stripe = (await import('stripe')).default;
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any, httpClient: Stripe.createFetchHttpClient() });
          event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
        } catch (err: any) {
          console.warn('[STRIPE WEBHOOK] Signature verification failed:', err.message);
          return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
        }
      }
    }

    if (!event) {
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const ref = session.metadata?.referenceNumber || session.metadata?.bookingId || session.client_reference_id;

      if (ref) {
        const booking = await bookingStore.getAsync(ref);
        if (booking && booking.paymentStatus !== 'PAID') {
          booking.paymentStatus = 'PAID';
          booking.bookingStatus = 'CONFIRMED';
          booking.stripePaymentIntentId = session.payment_intent;
          booking.updatedAt = new Date().toISOString();

          // Dispatch to TBMS
          if (booking.tbmsStatus !== 'SYNCED') {
            try {
              const tbmsRes = await syncCustomerBookingToTbms(booking);
              if (tbmsRes.success) {
                booking.tbmsStatus = 'SYNCED';
                booking.tbmsJobReference = tbmsRes.jobReference;
                booking.tbmsSyncedAt = new Date().toISOString();
              } else {
                booking.tbmsStatus = 'FAILED';
                booking.tbmsError = tbmsRes.error;
              }
            } catch (err: any) {
              booking.tbmsStatus = 'FAILED';
              booking.tbmsError = err?.message;
            }
          }

          await bookingStore.saveAsync(booking);

          // Confirmation emails
          sendCustomerBookingConfirmationEmail(booking).catch(() => {});
          sendStaffBookingAlertEmail(booking).catch(() => {});
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[STRIPE WEBHOOK] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

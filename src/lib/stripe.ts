import { CustomerBooking } from '@/types/booking';
import { getEnv } from '@/lib/env';

export interface StripeCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  isDemo?: boolean;
  error?: string;
}

export interface StripeSessionVerification {
  isValid: boolean;
  isPaid: boolean;
  paymentIntentId?: string;
  amountTotal?: number;
  customerEmail?: string;
  isDemo?: boolean;
  error?: string;
}

/**
 * Creates a hosted Stripe Checkout Session for a customer booking
 */
export async function createStripeCheckoutSession(
  booking: CustomerBooking,
  baseUrl: string
): Promise<StripeCheckoutResult> {
  const secretKey = getEnv('STRIPE_SECRET_KEY');

  // If Stripe is not configured or in demo mode, provide instant test checkout for local verification
  if (!secretKey || secretKey.startsWith('your_') || secretKey.length < 10) {
    console.log('[STRIPE] Notice: STRIPE_SECRET_KEY not set. Using local demo checkout verification.');
    const demoSessionId = 'demo_sess_' + Math.random().toString(36).substring(2, 12);
    const confirmationUrl = `${baseUrl.replace(/\/+$/, '')}/book/confirmation?session_id=${demoSessionId}&ref=${encodeURIComponent(booking.referenceNumber)}&demo=1`;
    return {
      success: true,
      checkoutUrl: confirmationUrl,
      sessionId: demoSessionId,
      isDemo: true,
    };
  }

  const successUrl = `${baseUrl.replace(/\/+$/, '')}/book/confirmation?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(booking.referenceNumber)}`;
  const cancelUrl = `${baseUrl.replace(/\/+$/, '')}/book?step=2&cancelled=1&ref=${encodeURIComponent(booking.referenceNumber)}`;

  // Convert fare to minor units (pence)
  const unitAmount = Math.round(booking.fare * 100);

  const params = new URLSearchParams();
  params.append('payment_method_types[0]', 'card');
  params.append('mode', 'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  if (booking.customerEmail) {
    params.append('customer_email', booking.customerEmail);
  }

  // Line item
  params.append('line_items[0][price_data][currency]', 'gbp');
  params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
  params.append(
    'line_items[0][price_data][product_data][name]',
    `Flame Cars Transfer — ${booking.vehicleName}`
  );
  params.append(
    'line_items[0][price_data][product_data][description]',
    `${booking.pickupAddress} ➔ ${booking.destinationAddress} (${booking.pickupDate} at ${booking.pickupTime})`
  );
  params.append('line_items[0][quantity]', '1');

  // Metadata
  params.append('metadata[bookingId]', booking.id);
  params.append('metadata[referenceNumber]', booking.referenceNumber);
  params.append('metadata[customerName]', booking.customerName);
  params.append('metadata[customerPhone]', booking.customerPhone);
  params.append('metadata[vehicleCategory]', booking.vehicleCategory);

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[STRIPE] Checkout Session Error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to create Stripe payment session',
      };
    }

    return {
      success: true,
      checkoutUrl: data.url,
      sessionId: data.id,
      isDemo: false,
    };
  } catch (err: any) {
    console.error('[STRIPE] Exception creating session:', err);
    return {
      success: false,
      error: err?.message || 'Network error connecting to payment gateway',
    };
  }
}

/**
 * Verifies a Stripe Checkout Session status on the server
 */
export async function verifyStripeSession(sessionId: string): Promise<StripeSessionVerification> {
  if (sessionId.startsWith('demo_sess_')) {
    return {
      isValid: true,
      isPaid: true,
      paymentIntentId: 'pi_demo_' + sessionId.replace('demo_sess_', ''),
      amountTotal: 0,
      isDemo: true,
    };
  }

  const secretKey = getEnv('STRIPE_SECRET_KEY');
  if (!secretKey) {
    return {
      isValid: false,
      isPaid: false,
      error: 'STRIPE_SECRET_KEY is not configured on the server',
    };
  }

  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const session = await res.json();
    if (!res.ok) {
      return {
        isValid: false,
        isPaid: false,
        error: session.error?.message || 'Failed to retrieve Stripe session',
      };
    }

    const isPaid = session.payment_status === 'paid';
    return {
      isValid: true,
      isPaid,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
      amountTotal: session.amount_total ? session.amount_total / 100 : undefined,
      customerEmail: session.customer_details?.email || session.customer_email || undefined,
      isDemo: false,
    };
  } catch (err: any) {
    return {
      isValid: false,
      isPaid: false,
      error: err?.message || 'Failed to verify payment with Stripe',
    };
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { bookingStore, generateSecureBookingId, generateSecureBookingRef } from '@/lib/bookingStore';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { CustomerBooking, VehicleCategory } from '@/types/booking';
import { getEnv } from '@/lib/env';

function resolveBaseUrl(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    return `${proto}://${host}`.replace(/\/+$/, '');
  }
  const appUrl = getEnv('NEXT_PUBLIC_APP_URL');
  if (appUrl) {
    return appUrl.replace(/\/+$/, '');
  }
  return 'https://flamecars.co.uk';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      quoteId,
      selectedVehicleCategory,
      customerName,
      customerEmail,
      customerPhone,
      flightNumber,
      notes,
    } = body || {};

    if (!quoteId || typeof quoteId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Quote session ID is required.' },
        { status: 400 }
      );
    }

    const quote = bookingStore.getQuote(quoteId);
    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote session has expired or is invalid. Please get a fresh quote.' },
        { status: 400 }
      );
    }

    if (!quote.isOriginEligible) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Pickups are strictly inside Greater London or the 5 London airports (Heathrow, Gatwick, Stansted, Luton, City). Please contact dispatch.',
        },
        { status: 400 }
      );
    }

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter passenger full name.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address for confirmation.' },
        { status: 400 }
      );
    }

    const cleanPhone = (customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid UK or international contact number.' },
        { status: 400 }
      );
    }

    const category = (selectedVehicleCategory || 'economy') as VehicleCategory;
    const vehicle = quote.vehicles.find((v) => v.id === category);

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Invalid vehicle category selected.' },
        { status: 400 }
      );
    }

    if (quote.passengers > vehicle.maxPassengers) {
      return NextResponse.json(
        {
          success: false,
          error: `Selected ${vehicle.name} accommodates up to ${vehicle.maxPassengers} passengers. You requested ${quote.passengers}.`,
        },
        { status: 400 }
      );
    }

    if (quote.luggage > vehicle.maxLuggage) {
      return NextResponse.json(
        {
          success: false,
          error: `Selected ${vehicle.name} accommodates up to ${vehicle.maxLuggage} luggage items. You requested ${quote.luggage}.`,
        },
        { status: 400 }
      );
    }

    const bookingId = generateSecureBookingId();
    const referenceNumber = generateSecureBookingRef();
    const nowIso = new Date().toISOString();

    const booking: CustomerBooking = {
      id: bookingId,
      referenceNumber,
      quoteId: quote.quoteId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      pickupAddress: quote.pickupAddress,
      destinationAddress: quote.destinationAddress,
      pickupDate: quote.pickupDate,
      pickupTime: quote.pickupTime,
      pickupDateTimeIso: quote.pickupDateTimeIso,
      passengers: quote.passengers,
      luggage: quote.luggage,
      vehicleCategory: vehicle.id,
      vehicleName: vehicle.name,
      tbmsCarTypeId: vehicle.tbmsCarTypeId,
      fare: vehicle.totalFare,
      driverPayout: vehicle.driverPayout,
      journeyType: quote.journeyType,
      airportCharges: quote.airportCharges,
      airportFee: quote.airportCharges,
      distanceMiles: quote.distanceMiles,
      fareBreakdown: {
        driverPayout: vehicle.driverPayout,
        airportCharges: quote.airportCharges,
        processingFee: Math.round((vehicle.totalFare * 0.015 + 0.2) * 100) / 100,
        profitMargin: Math.round(vehicle.totalFare * 0.2 * 100) / 100,
        totalFare: vehicle.totalFare,
      },
      flightNumber: flightNumber ? String(flightNumber).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      bookingStatus: 'PENDING_PAYMENT',
      paymentStatus: 'UNPAID',
      tbmsStatus: 'NOT_ATTEMPTED',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const baseUrl = resolveBaseUrl(req);
    const checkoutResult = await createStripeCheckoutSession(booking, baseUrl);

    if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
      return NextResponse.json(
        { success: false, error: checkoutResult.error || 'Failed to initialize payment gateway.' },
        { status: 500 }
      );
    }

    booking.stripeSessionId = checkoutResult.sessionId;
    await bookingStore.saveAsync(booking);

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      referenceNumber: booking.referenceNumber,
      checkoutUrl: checkoutResult.checkoutUrl,
      isDemo: checkoutResult.isDemo || false,
    });
  } catch (err: any) {
    console.error('[API /booking/checkout] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process checkout' },
      { status: 500 }
    );
  }
}

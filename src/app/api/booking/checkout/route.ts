import { NextRequest, NextResponse } from 'next/server';
import { bookingStore, generateSecureBookingId, generateSecureBookingRef } from '@/lib/bookingStore';
import { createStripeCheckoutSession } from '@/lib/stripe';
import { CustomerBooking, VehicleCategory } from '@/types/booking';
import { getEnv } from '@/lib/env';
import { validateAndCalculateDiscount, recordDiscountUsage } from '@/lib/fareConfig';
import { syncCustomerBookingToTbms } from '@/lib/tbms';
import { sendCustomerBookingConfirmationEmail, sendStaffBookingAlertEmail } from '@/lib/mailgun';

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
      discountCode,
      isTestSubmission,
    } = body || {};

    if (!quoteId || typeof quoteId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Quote session ID is required.' },
        { status: 400 }
      );
    }

    const quote = await bookingStore.getQuoteAsync(quoteId);
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

    // Calculate pricing and check for optional discount code
    let finalFare = vehicle.totalFare;
    let appliedDiscountCode: string | undefined = undefined;
    let appliedDiscountAmount: number | undefined = undefined;
    let appliedMarginPercent: number | undefined = undefined;
    let netProfitAmount: number | undefined = undefined;

    if (discountCode && typeof discountCode === 'string' && discountCode.trim()) {
      const discResult = validateAndCalculateDiscount({
        code: discountCode.trim(),
        fare: vehicle.totalFare,
        driverPayout: vehicle.driverPayout,
        airportCharges: quote.airportCharges,
        airportCode: quote.airportCode,
        vehicleCategory: vehicle.id,
      });

      if (!discResult.valid) {
        return NextResponse.json(
          {
            success: false,
            error: discResult.error || 'The applied discount code is not valid for this booking.',
          },
          { status: 400 }
        );
      }

      finalFare = discResult.discountedFare;
      appliedDiscountCode = discResult.discountCode?.code;
      appliedDiscountAmount = discResult.discountAmount;
      appliedMarginPercent = discResult.marginPercent;
      netProfitAmount = discResult.netProfit;

      // Increment discount code usage
      if (appliedDiscountCode) {
        recordDiscountUsage(appliedDiscountCode);
      }
    }

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
      fare: finalFare,
      originalFare: appliedDiscountCode ? vehicle.totalFare : undefined,
      discountCode: appliedDiscountCode,
      discountAmount: appliedDiscountAmount,
      netMarginPercent: appliedMarginPercent,
      driverPayout: vehicle.driverPayout,
      journeyType: quote.journeyType,
      airportCharges: quote.airportCharges,
      airportFee: quote.airportCharges,
      distanceMiles: quote.distanceMiles,
      fareBreakdown: {
        driverPayout: vehicle.driverPayout,
        airportCharges: quote.airportCharges,
        processingFee: Math.round((finalFare * 0.015 + 0.2) * 100) / 100,
        profitMargin: netProfitAmount !== undefined ? netProfitAmount : Math.round(finalFare * 0.2 * 100) / 100,
        totalFare: finalFare,
        originalFare: appliedDiscountCode ? vehicle.totalFare : undefined,
        discountAmount: appliedDiscountAmount,
        netProfit: netProfitAmount,
        marginPercent: appliedMarginPercent,
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

    // Option: Test Submission without Payment (Instant Confirmation, TBMS Sync & Email Dispatch)
    if (isTestSubmission) {
      booking.paymentStatus = 'PAID';
      booking.bookingStatus = 'CONFIRMED';
      booking.paymentMethod = 'TEST_BYPASS';
      booking.paidAt = nowIso;

      // Dispatch to TBMS live dispatch engine
      try {
        const tbmsResult = await syncCustomerBookingToTbms(booking);
        if (tbmsResult.success) {
          booking.tbmsStatus = 'SYNCED';
          booking.tbmsJobReference = tbmsResult.jobReference;
          booking.tbmsSyncedAt = nowIso;
        } else {
          booking.tbmsStatus = 'FAILED';
          booking.tbmsError = tbmsResult.error;
        }
      } catch (tbmsErr: any) {
        booking.tbmsStatus = 'FAILED';
        booking.tbmsError = tbmsErr?.message || 'Failed connecting to TBMS';
      }

      // Send customer confirmation email & staff alert via Mailgun (awaited to guarantee completion in serverless)
      try {
        const [custRes, staffRes] = await Promise.allSettled([
          sendCustomerBookingConfirmationEmail(booking),
          sendStaffBookingAlertEmail(booking),
        ]);
        if (custRes.status === 'fulfilled' && custRes.value.success) {
          booking.customerEmailSent = true;
          booking.customerEmailMessageId = custRes.value.messageId;
        } else if (custRes.status === 'fulfilled' && !custRes.value.success) {
          console.warn('[EMAIL] Customer confirmation skipped/error:', custRes.value.error);
        } else if (custRes.status === 'rejected') {
          console.error('[EMAIL] Customer confirmation rejected:', custRes.reason);
        }
        if (staffRes.status === 'fulfilled' && staffRes.value.success) {
          booking.staffEmailSent = true;
        }
        await bookingStore.saveAsync(booking);
      } catch (emailErr) {
        console.error('[EMAIL] Exception sending test confirmation emails:', emailErr);
      }

      const confirmationUrl = `${baseUrl}/book/confirmation?ref=${encodeURIComponent(booking.referenceNumber)}&test=1`;

      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        referenceNumber: booking.referenceNumber,
        checkoutUrl: confirmationUrl,
        isTestSubmission: true,
        tbmsStatus: booking.tbmsStatus,
        tbmsJobReference: booking.tbmsJobReference,
      });
    }

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

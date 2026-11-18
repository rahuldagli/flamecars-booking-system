import { NextRequest, NextResponse } from 'next/server';
import { generateBookingQuoteAsync, validatePickupEligibility } from '@/lib/pricing';
import { bookingStore } from '@/lib/bookingStore';
import { QuoteRequest } from '@/types/booking';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<QuoteRequest>;

    if (!body.pickupAddress || typeof body.pickupAddress !== 'string' || body.pickupAddress.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid pickup address.' },
        { status: 400 }
      );
    }

    if (!body.destinationAddress || typeof body.destinationAddress !== 'string' || body.destinationAddress.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid destination address.' },
        { status: 400 }
      );
    }

    if (!body.pickupDate || !body.pickupTime) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid pickup date and time.' },
        { status: 400 }
      );
    }

    const quoteReq: QuoteRequest = {
      pickupAddress: body.pickupAddress.trim(),
      destinationAddress: body.destinationAddress.trim(),
      pickupDate: body.pickupDate,
      pickupTime: body.pickupTime,
      passengers: Math.max(1, Math.min(8, Number(body.passengers) || 1)),
      luggage: Math.max(0, Math.min(10, Number(body.luggage) || 0)),
    };

    const quote = await generateBookingQuoteAsync(quoteReq);

    // Save quote to memory/cache store for subsequent checkout validation
    bookingStore.saveQuote(quote);

    return NextResponse.json({
      success: true,
      quote,
    });
  } catch (err: any) {
    console.error('[API /booking/quote] Error generating quote:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to calculate quote' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { validateAndCalculateDiscount, DiscountValidationParams } from '@/lib/fareConfig';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      fare,
      driverPayout,
      airportCharges,
      airportCode,
      vehicleCategory,
    } = body || {};

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter a promotion code.' },
        { status: 400 }
      );
    }

    const params: DiscountValidationParams = {
      code: code.trim().toUpperCase(),
      fare: Number(fare) || 0,
      driverPayout: Number(driverPayout) || 0,
      airportCharges: Number(airportCharges) || 0,
      airportCode: airportCode || undefined,
      vehicleCategory: vehicleCategory || undefined,
    };

    const result = validateAndCalculateDiscount(params);

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          warning: result.warning,
          minMarginViolation: result.minMarginViolation || false,
          result,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to validate promotion code' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { bookingStore } from '@/lib/bookingStore';
import { syncCustomerBookingToTbms } from '@/lib/tbms';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const bookings = await bookingStore.getAllAsync();

    const counts = {
      TOTAL: bookings.length,
      CONFIRMED: bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length,
      PENDING_PAYMENT: bookings.filter((b) => b.bookingStatus === 'PENDING_PAYMENT').length,
      CANCELLED: bookings.filter((b) => b.bookingStatus === 'CANCELLED').length,
      TBMS_SYNCED: bookings.filter((b) => b.tbmsStatus === 'SYNCED').length,
      TBMS_FAILED: bookings.filter((b) => b.tbmsStatus === 'FAILED').length,
    };

    return NextResponse.json({
      success: true,
      counts,
      bookings,
    });
  } catch (error: any) {
    console.error('Admin Bookings List Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve bookings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await req.json();
    const { bookingRef, action } = body || {};

    if (!bookingRef) {
      return NextResponse.json({ error: 'bookingRef is required' }, { status: 400 });
    }

    const booking = await bookingStore.getAsync(bookingRef);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (action === 'retry-tbms') {
      const tbmsRes = await syncCustomerBookingToTbms(booking);
      if (tbmsRes.success) {
        booking.tbmsStatus = 'SYNCED';
        booking.tbmsJobReference = tbmsRes.jobReference;
        booking.tbmsSyncedAt = new Date().toISOString();
        booking.tbmsError = undefined;
      } else {
        booking.tbmsStatus = 'FAILED';
        booking.tbmsError = tbmsRes.error;
      }
      booking.updatedAt = new Date().toISOString();
      await bookingStore.saveAsync(booking);

      return NextResponse.json({
        success: tbmsRes.success,
        tbmsStatus: booking.tbmsStatus,
        jobReference: booking.tbmsJobReference,
        error: tbmsRes.error,
        booking,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin Booking Action Error:', error);
    return NextResponse.json({ error: 'Failed to process booking action' }, { status: 500 });
  }
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerBooking } from '@/types/booking';

export default function BookingConfirmationPage() {
  const [booking, setBooking] = useState<CustomerBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('id');
    const sessionId = params.get('session_id') || params.get('sessionId');

    if (!ref) {
      setError('No booking reference provided in URL.');
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const query = new URLSearchParams({ ref });
        if (sessionId) query.set('session_id', sessionId);

        const res = await fetch(`/api/booking/status?${query.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to verify booking payment status.');
          setLoading(false);
          return;
        }

        setBooking(data.booking);
      } catch (err: any) {
        setError(err?.message || 'Error communicating with booking server.');
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          Verifying Payment &amp; Dispatching Chauffeur...
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Please wait a moment while we secure your booking and allocate it to the Flame Cars dispatch system.
        </p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #fecaca' }}>
        <h2 style={{ color: '#b91c1c', fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
          Booking Status Notice
        </h2>
        <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '20px' }}>
          {error || 'Unable to locate booking details.'}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/book"
            style={{
              background: '#ed6b24',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Start New Booking
          </Link>
          <a
            href="tel:02034008257"
            style={{
              background: '#f1f5f9',
              color: '#334155',
              padding: '10px 18px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Call Dispatch (020 3400 8257)
          </a>
        </div>
      </div>
    );
  }

  const isPaid = booking.paymentStatus === 'PAID';

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 16px' }}>
      {/* Success Hero Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          padding: '32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isPaid ? '#dcfce7' : '#fef3c7',
              color: isPaid ? '#15803d' : '#b45309',
              fontSize: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            {isPaid ? '✓' : '⏱️'}
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
            {isPaid ? 'Booking Confirmed & Dispatched' : 'Payment Processing'}
          </h1>

          <p style={{ color: '#64748b', fontSize: '15px', margin: 0 }}>
            Thank you, <strong>{booking.customerName}</strong>. Your transfer has been registered.
          </p>

          {/* Reference pill */}
          <div
            style={{
              display: 'inline-block',
              marginTop: '16px',
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '8px 18px',
              fontFamily: 'monospace',
              fontSize: '16px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '0.04em',
            }}
          >
            Booking Ref: {booking.referenceNumber}
          </div>
        </div>

        {/* Live System Status Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              background: isPaid ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '20px' }}>{isPaid ? '💳' : '⏳'}</span>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Payment Status
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: isPaid ? '#15803d' : '#b45309' }}>
                {isPaid ? 'Paid in Full via Stripe' : 'Awaiting Confirmation'}
              </div>
            </div>
          </div>

          <div
            style={{
              background: booking.tbmsStatus === 'SYNCED' ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${booking.tbmsStatus === 'SYNCED' ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🚖</span>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Dispatch Allocation
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: booking.tbmsStatus === 'SYNCED' ? '#15803d' : '#334155' }}>
                {booking.tbmsStatus === 'SYNCED'
                  ? `Live Job Ref: ${booking.tbmsJobReference || 'Dispatched'}`
                  : 'Flame Cars Operations Alerted'}
              </div>
            </div>
          </div>
        </div>

        {/* Itinerary Details */}
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '12px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
            Journey &amp; Vehicle Summary
          </div>

          <div style={{ padding: '18px', display: 'grid', gridTemplateColumns: '1fr', gap: '14px', fontSize: '14px' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>PICKUP LOCATION</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{booking.pickupAddress}</span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>DESTINATION</span>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{booking.destinationAddress}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>DATE &amp; TIME</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{booking.pickupDate} at {booking.pickupTime}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>VEHICLE CATEGORY</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{booking.vehicleName}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>PASSENGER REQUIREMENTS</span>
                <span style={{ color: '#0f172a' }}>{booking.passengers} Passengers · {booking.luggage} Bags</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>TOTAL AMOUNT PAID</span>
                <span style={{ color: '#ed6b24', fontWeight: 800, fontSize: '16px' }}>£{booking.fare.toFixed(2)}</span>
              </div>
            </div>

            {booking.flightNumber && (
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>FLIGHT NUMBER</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{booking.flightNumber}</span>
              </div>
            )}

            {booking.notes && (
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '12px', fontWeight: 600 }}>DRIVER NOTES</span>
                <span style={{ color: '#0f172a' }}>{booking.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps Guidance */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '16px',
            fontSize: '13px',
            color: '#475569',
            lineHeight: '1.6',
            marginBottom: '28px',
          }}
        >
          <strong style={{ color: '#0f172a', display: 'block', marginBottom: '6px' }}>What happens next?</strong>
          • A booking receipt and VAT invoice has been sent to <strong>{booking.customerEmail}</strong>.<br />
          • Your chauffeur will be assigned prior to your journey, and you will receive an SMS notification with driver name, contact number, and vehicle registration.<br />
          • For airport pickups, our dispatch team monitors flight arrivals in real-time. 45 minutes complimentary waiting time starts from flight landing time.<br />
          • Need to make adjustments? Call our 24/7 team on <a href="tel:02034008257" style={{ color: '#ed6b24', fontWeight: 700 }}>020 3400 8257</a> quoting <strong>{booking.referenceNumber}</strong>.
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🖨️ Print Receipt
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              href="/book"
              style={{
                background: '#ed6b24',
                color: '#ffffff',
                padding: '12px 22px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '14px',
                display: 'inline-block',
              }}
            >
              Book Another Journey →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

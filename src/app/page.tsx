'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [checkingRef, setCheckingRef] = useState(true);

  // Preserve backwards compatibility for driver links: ?ref=FLM-DRV-...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || params.get('reference') || params.get('id');
      const isHome = params.get('home') === '1';

      if (ref && !isHome) {
        // Driver email review/modify link -> route to dedicated driver onboarding page
        router.replace(`/driver${window.location.search}`);
        return;
      }
      setCheckingRef(false);
    }
  }, [router]);

  if (checkingRef) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔥</div>
          <div>Loading Flame Cars...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '36px 16px 60px' }}>
      {/* Hero Headline */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffedd5',
            color: '#c2410c',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          <span>🔥</span> Licensed London Private Hire Operator
        </div>

        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 44px)',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.15,
            margin: '0 0 16px',
            letterSpacing: '-0.03em',
          }}
        >
          Premium Transfers &amp; Chauffeur Services <br />
          <span style={{ color: '#ed6b24' }}>Across London &amp; the UK</span>
        </h1>

        <p
          style={{
            fontSize: '17px',
            color: '#64748b',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          Fixed-rate airport transfers, executive city travel, and reliable private hire.
          Book your vehicle online with instant confirmation or apply to join our fleet.
        </p>
      </div>

      {/* Main Dual Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '48px',
        }}
      >
        {/* Customer Booking Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '2px solid #ed6b24',
            boxShadow: '0 12px 30px rgba(237, 107, 36, 0.08)',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: '#ffedd5',
              color: '#c2410c',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '12px',
            }}
          >
            Instant Online Quote
          </div>

          <div>
            <div style={{ fontSize: '38px', marginBottom: '14px' }}>🚗</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              Book a Transfer
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
              Pickups from Greater London and all 5 major London airports (Heathrow, Gatwick, Stansted, Luton, London City) to anywhere in the UK.
            </p>

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 24px',
                fontSize: '14px',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <li>✓ Guaranteed fixed fare calculated by road miles</li>
              <li>✓ 45 mins complimentary airport wait + flight tracking</li>
              <li>✓ Saloon, 6-Seater MPV &amp; Executive Mercedes classes</li>
              <li>✓ Secure Stripe credit/debit card checkout</li>
            </ul>
          </div>

          <Link
            href="/book"
            style={{
              background: '#ed6b24',
              color: '#ffffff',
              textAlign: 'center',
              padding: '14px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(237, 107, 36, 0.3)',
              display: 'block',
            }}
          >
            Calculate Fare &amp; Book Transfer →
          </Link>
        </div>

        {/* Driver Onboarding Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '38px', marginBottom: '14px' }}>📋</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
              Drive with Flame Cars
            </h2>
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '0 0 20px' }}>
              Join our network of elite TfL-licensed private hire drivers. Fast 5-minute digital registration, instant AI document verification, and prompt TBMS approval.
            </p>

            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 24px',
                fontSize: '14px',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <li>✓ AI document scanning with auto-fill</li>
              <li>✓ High-value London &amp; airport transfer jobs</li>
              <li>✓ Flexible schedule &amp; dedicated compliance team</li>
              <li>✓ Direct weekly bank payouts</li>
            </ul>
          </div>

          <Link
            href="/driver"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              textAlign: 'center',
              padding: '14px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '16px',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            Driver Onboarding Registration →
          </Link>
        </div>
      </div>

      {/* Trust & Coverage Bar */}
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            5 Airports
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Heathrow, Gatwick, Stansted, Luton &amp; London City
          </div>
        </div>

        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            Fixed Pricing
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Road distance calculation with no surge pricing
          </div>
        </div>

        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            TfL Licensed
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            London Private Hire Operator compliant
          </div>
        </div>

        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            24/7 Operations
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Live dispatch center &amp; telephone support
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';

const AIRPORTS = [
  { code: 'LHR', name: 'London Heathrow', detail: 'Terminals 2, 3, 4 & 5 • Meet & Greet' },
  { code: 'LGW', name: 'London Gatwick', detail: 'North & South Terminals' },
  { code: 'STN', name: 'London Stansted', detail: 'Express & Private Transfers' },
  { code: 'LTN', name: 'London Luton', detail: '24/7 Flight Monitored Pickups' },
  { code: 'LCY', name: 'London City', detail: 'Docklands & Canary Wharf' },
  { code: 'LON', name: 'Greater London', detail: 'Hotels, Stations & Residential' },
];

const VEHICLES = [
  {
    name: 'Economy Saloon',
    icon: '🚗',
    capacity: 'Up to 4 Pax • 2 Bags',
    models: 'Toyota Prius, Skoda Octavia, VW Passat',
  },
  {
    name: 'Estate',
    icon: '🚙',
    capacity: 'Up to 4 Pax • 4 Bags',
    models: 'Skoda Superb Estate, VW Passat Estate',
  },
  {
    name: '6-Seater MPV',
    icon: '🚐',
    capacity: 'Up to 6 Pax • 4 Bags',
    models: 'VW Sharan, Ford Galaxy, Mercedes Vito',
  },
  {
    name: 'Executive Saloon',
    icon: '🚘',
    capacity: 'Up to 3 Pax • 2 Bags',
    models: 'Mercedes E-Class, BMW 5 Series',
  },
];

export default function BookingsLandingPage() {
  return (
    <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '40px 16px 64px' }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '44px' }}>
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
          <span>✈️</span> TfL-Licensed London Airport Transfers &amp; Chauffeurs
        </div>

        <h1
          style={{
            fontSize: 'clamp(30px, 5vw, 46px)',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.12,
            margin: '0 0 16px',
            letterSpacing: '-0.03em',
          }}
        >
          Fixed-Fare Private Transfers <br />
          <span style={{ color: '#ed6b24' }}>Across London &amp; All Major Airports</span>
        </h1>

        <p
          style={{
            fontSize: '17px',
            color: '#64748b',
            maxWidth: '660px',
            margin: '0 auto 28px',
            lineHeight: 1.55,
          }}
        >
          Get an instant, guaranteed fixed quote in seconds. No surge pricing, real-time flight monitoring,
          complimentary airport waiting time, and secure online card checkout.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href="/book"
            style={{
              background: '#ed6b24',
              color: '#ffffff',
              padding: '15px 32px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '16px',
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(237, 107, 36, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Calculate Fare &amp; Book Now →
          </Link>
          <a
            href="tel:02034008257"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              padding: '15px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '15px',
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
            }}
          >
            📞 24/7 Dispatch: 020 3400 8257
          </a>
        </div>
      </div>

      {/* Key Value Props */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '48px',
        }}
      >
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '26px', marginBottom: '8px' }}>💷</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>Guaranteed Fixed Fares</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Transparent road-mileage pricing with airport drop-off and parking charges included upfront.
          </p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '26px', marginBottom: '8px' }}>🛫</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>Live Flight Tracking</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            We monitor your flight landing time automatically and include 45–60 mins complimentary airport wait.
          </p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '26px', marginBottom: '8px' }}>🔒</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>Instant Confirmation</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Pay securely via Stripe with instant email receipt and live dispatch allocation.
          </p>
        </div>
      </div>

      {/* Airports Covered */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', textAlign: 'center', margin: '0 0 20px' }}>
          Coverage Across London &amp; UK Airports
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
          }}
        >
          {AIRPORTS.map((a) => (
            <Link
              key={a.code}
              href="/book"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  background: '#fff7ed',
                  color: '#ea580c',
                  fontWeight: 800,
                  fontSize: '13px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  minWidth: '48px',
                  textAlign: 'center',
                }}
              >
                {a.code}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>{a.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{a.detail}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Fleet Classes */}
      <div style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', textAlign: 'center', margin: '0 0 20px' }}>
          Our Executive &amp; Standard Fleet
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
          }}
        >
          {VEHICLES.map((v) => (
            <div
              key={v.name}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{v.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '4px' }}>{v.name}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#ea580c', marginBottom: '6px' }}>{v.capacity}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{v.models}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px' }}>Ready to Book Your Journey?</h2>
        <p style={{ color: '#cbd5e1', fontSize: '14px', maxWidth: '520px', margin: '0 auto 20px' }}>
          Enter your pickup and destination to compare vehicle classes and lock in your fixed fare.
        </p>
        <Link
          href="/book"
          style={{
            background: '#ed6b24',
            color: '#ffffff',
            padding: '14px 28px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '15px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Get Instant Quote →
        </Link>
      </div>
    </div>
  );
}

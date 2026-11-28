'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalType, detectPortalFromHost, getPortalUrl } from '@/lib/subdomains';

interface SiteHeaderProps {
  initialPortal?: PortalType;
  initialHost?: string;
}

export default function SiteHeader({ initialPortal = 'default', initialHost = '' }: SiteHeaderProps) {
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const [host, setHost] = useState<string>(initialHost);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHost = window.location.host;
      setHost(currentHost);
      setPortal(detectPortalFromHost(currentHost));
    }
  }, []);

  const subtitle =
    portal === 'bookings'
      ? 'AIRPORT TRANSFERS & CHAUFFEURS'
      : portal === 'driver'
      ? 'DRIVER ONBOARDING PORTAL'
      : portal === 'staff'
      ? 'STAFF OPERATIONS PORTAL'
      : 'LONDON PRIVATE HIRE';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '12px',
          paddingBottom: '12px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--flame-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--flame-glow)',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>🔥</span>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: '18px',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                FLAME <span style={{ color: 'var(--flame-500)' }}>CARS</span>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {subtitle}
              </div>
            </div>
          </Link>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {portal === 'bookings' && (
            <>
              <Link
                href="/book"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--flame-500)',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(237, 107, 36, 0.25)',
                }}
              >
                🚗 Book Transfer
              </Link>
              <a
                href="tel:02034008257"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  textDecoration: 'none',
                }}
              >
                📞 020 3400 8257
              </a>
            </>
          )}

          {portal === 'driver' && (
            <>
              <Link
                href="/"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--flame-500)',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(237, 107, 36, 0.25)',
                }}
              >
                📋 Driver Portal
              </Link>
              <a
                href="tel:02034008257"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  textDecoration: 'none',
                }}
              >
                📞 Onboarding Help: 020 3400 8257
              </a>
            </>
          )}

          {portal === 'staff' && (
            <>
              <a
                href={getPortalUrl('bookings', host, '/book')}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  textDecoration: 'none',
                }}
              >
                🚗 Bookings Site ↗
              </a>
              <a
                href={getPortalUrl('driver', host, '/')}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  textDecoration: 'none',
                }}
              >
                📋 Driver Portal ↗
              </a>
              <Link
                href="/"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#0f172a',
                  textDecoration: 'none',
                }}
              >
                🛡️ Staff Operations
              </Link>
            </>
          )}

          {portal === 'default' && (
            <>
              <Link
                href="/book"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--flame-500)',
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(237, 107, 36, 0.25)',
                }}
              >
                🚗 Book Transfer
              </Link>
              <Link
                href="/driver"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#f8fafc',
                  border: '1px solid var(--border-medium)',
                  textDecoration: 'none',
                }}
              >
                Drive with Us
              </Link>
              <Link
                href="/admin"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  textDecoration: 'none',
                }}
              >
                Staff Portal
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

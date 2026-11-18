import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Flame Cars | Premium Private Hire & Airport Transfers London',
  description:
    'Licensed London Private Hire Operator. Fixed-rate airport transfers, executive chauffeur hire, and digital driver onboarding portal.',
  keywords: ['Flame Cars', 'London Airport Transfer', 'Private Hire London', 'Driver Onboarding', 'TfL Private Hire'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </head>
      <body suppressHydrationWarning>
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
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    FLAME <span style={{ color: 'var(--flame-500)' }}>CARS</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    LONDON PRIVATE HIRE
                  </div>
                </div>
              </Link>
            </div>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            </nav>
          </div>
        </header>

        <main style={{ minHeight: 'calc(100vh - 160px)', paddingBottom: '60px' }}>
          {children}
        </main>

        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: '#ffffff',
            padding: '30px 0',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <div className="container" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <strong>Flame Cars</strong> • Licensed London Private Hire Operator (TfL)
            </p>
            <p style={{ marginBottom: '6px' }}>
              112 College Road, Harrow Weald, Harrow, England, HA3 6EB • Telephone: <a href="tel:02034008257">020 3400 8257</a> • Support: <a href="mailto:support@flamecars.co.uk">support@flamecars.co.uk</a>
            </p>
            <p style={{ fontSize: '11px', marginTop: '12px', color: 'var(--text-muted)' }}>
              &copy; {new Date().getFullYear()} Flame Cars. All applicant data is processed securely under UK GDPR and TfL regulatory retention standards.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

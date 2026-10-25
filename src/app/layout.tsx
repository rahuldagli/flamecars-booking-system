import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Flame Cars | Driver Onboarding & Compliance Portal',
  description:
    'Join Flame Cars as an independent TfL-licensed private hire driver. Fast digital registration, secure document collection, and rapid dispatch approval.',
  keywords: ['Flame Cars', 'Driver Onboarding', 'TfL Private Hire', 'London Minicab Driver', 'TBMS Integration'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </head>
      <body>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(9, 11, 17, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '14px',
              paddingBottom: '14px',
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
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: '#fff' }}>
                    FLAME <span style={{ color: 'var(--flame-500)' }}>CARS</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em' }}>
                    DRIVER ONBOARDING
                  </div>
                </div>
              </Link>
            </div>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href="tel:02034008257"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
                className="desktop-call-btn"
              >
                <span>📞</span> 020 3400 8257
              </a>

              <Link
                href="/admin"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
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
            background: 'var(--bg-secondary)',
            padding: '30px 0',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <div className="container" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
              <strong>Flame Cars</strong> &bull; Licensed London Private Hire Operator (TfL)
            </p>
            <p style={{ marginBottom: '6px' }}>
              112 College Road, Harrow Weald, Harrow, England, HA3 6EB &bull; Telephone: <a href="tel:02034008257">020 3400 8257</a> &bull; Support: <a href="mailto:support@flamecars.co.uk">support@flamecars.co.uk</a>
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

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import { detectPortalFromHost } from '@/lib/subdomains';

export const metadata: Metadata = {
  title: 'Flame Cars | Premium Private Hire & Airport Transfers London',
  description:
    'Licensed London Private Hire Operator. Fixed-rate airport transfers, executive chauffeur hire, and digital driver onboarding portal.',
  keywords: ['Flame Cars', 'London Airport Transfer', 'Private Hire London', 'Driver Onboarding', 'TfL Private Hire'],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') || hdrs.get('host') || '';
  const initialPortal = (hdrs.get('x-flamecars-portal') as any) || detectPortalFromHost(host);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </head>
      <body suppressHydrationWarning>
        <SiteHeader initialPortal={initialPortal} initialHost={host} />

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

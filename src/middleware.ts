import { NextRequest, NextResponse } from 'next/server';
import { detectPortalFromHost, getPortalUrl } from '@/lib/subdomains';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Always allow API routes, Next.js internals, and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const portal = detectPortalFromHost(host);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-flamecars-portal', portal);

  // 1. BOOKINGS SUBDOMAIN (bookings.flamecars.co.uk)
  if (portal === 'bookings') {
    if (pathname.startsWith('/driver')) {
      return NextResponse.redirect(new URL(getPortalUrl('driver', host, pathname + search)));
    }
    if (pathname.startsWith('/admin')) {
      const targetPath = pathname === '/admin' ? '/' + search : pathname + search;
      return NextResponse.redirect(new URL(getPortalUrl('staff', host, targetPath)));
    }
    if (pathname === '/') {
      const ref = request.nextUrl.searchParams.get('ref') || '';
      if (ref.toUpperCase().startsWith('FLM-DRV-')) {
        return NextResponse.redirect(new URL(getPortalUrl('driver', host, '/' + search)));
      }
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = '/book-landing';
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 2. DRIVER SUBDOMAIN (driver.flamecars.co.uk)
  if (portal === 'driver') {
    if (pathname.startsWith('/book')) {
      return NextResponse.redirect(new URL(getPortalUrl('bookings', host, pathname + search)));
    }
    if (pathname.startsWith('/admin')) {
      const targetPath = pathname === '/admin' ? '/' + search : pathname + search;
      return NextResponse.redirect(new URL(getPortalUrl('staff', host, targetPath)));
    }
    if (pathname === '/') {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = '/driver';
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 3. STAFF SUBDOMAIN (staff.flamecars.co.uk)
  if (portal === 'staff') {
    if (pathname.startsWith('/book')) {
      return NextResponse.redirect(new URL(getPortalUrl('bookings', host, pathname + search)));
    }
    if (pathname.startsWith('/driver')) {
      return NextResponse.redirect(new URL(getPortalUrl('driver', host, pathname + search)));
    }
    if (pathname === '/') {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = '/admin';
      return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 4. DEFAULT (localhost / workers.dev preview)
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

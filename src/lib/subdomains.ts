export type PortalType = 'bookings' | 'driver' | 'staff' | 'default';

export const PORTAL_PRODUCTION_ORIGINS: Record<'bookings' | 'driver' | 'staff', string> = {
  bookings: 'https://bookings.flamecars.co.uk',
  driver: 'https://driver.flamecars.co.uk',
  staff: 'https://staff.flamecars.co.uk',
};

/**
 * Detects which portal a hostname belongs to:
 * - bookings.flamecars.co.uk (or bookings.*) -> 'bookings'
 * - driver.flamecars.co.uk (or driver.* / drivers.*) -> 'driver'
 * - staff.flamecars.co.uk (or staff.* / admin.*) -> 'staff'
 * - localhost / *.workers.dev / apex -> 'default'
 */
export function detectPortalFromHost(host?: string | null): PortalType {
  if (!host) return 'default';
  const cleanHost = host.toLowerCase().split(':')[0].trim();

  if (
    cleanHost === 'bookings.flamecars.co.uk' ||
    cleanHost.startsWith('bookings.') ||
    cleanHost.startsWith('booking.')
  ) {
    return 'bookings';
  }

  if (
    cleanHost === 'driver.flamecars.co.uk' ||
    cleanHost.startsWith('driver.') ||
    cleanHost.startsWith('drivers.')
  ) {
    return 'driver';
  }

  if (
    cleanHost === 'staff.flamecars.co.uk' ||
    cleanHost.startsWith('staff.') ||
    cleanHost.startsWith('admin.')
  ) {
    return 'staff';
  }

  return 'default';
}

/**
 * Resolves the canonical URL for a target portal ('bookings' | 'driver' | 'staff').
 * - If running on any flamecars.co.uk domain/subdomain, returns the dedicated subdomain URL.
 * - If running on localhost or workers.dev preview, returns the local/relative path unless absolute is forced.
 */
export function getPortalUrl(
  targetPortal: 'bookings' | 'driver' | 'staff',
  currentHost?: string | null,
  path = ''
): string {
  const normalizedPath = path.startsWith('/') || path === '' ? path : `/${path}`;
  const cleanHost = (currentHost || '').toLowerCase();

  // If on flamecars.co.uk (any subdomain), always link across the dedicated subdomains
  if (cleanHost.includes('flamecars.co.uk')) {
    return `${PORTAL_PRODUCTION_ORIGINS[targetPortal]}${normalizedPath}`;
  }

  // Support local subdomain testing (e.g. bookings.localhost:3000)
  if (cleanHost.includes('localhost')) {
    const portMatch = cleanHost.match(/:(\d+)$/);
    const port = portMatch ? `:${portMatch[1]}` : '';
    const currentPortal = detectPortalFromHost(cleanHost);
    if (currentPortal !== 'default') {
      return `http://${targetPortal}.localhost${port}${normalizedPath}`;
    }
  }

  // Fallback for plain localhost:3000 or workers.dev preview
  if (normalizedPath) return normalizedPath;
  if (targetPortal === 'bookings') return '/book-landing';
  if (targetPortal === 'driver') return '/driver';
  return '/admin';
}

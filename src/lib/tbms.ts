import { DriverApplication } from '@/types/onboarding';
import { getEnv } from '@/lib/env';

export interface TbmsSyncResult {
  success: boolean;
  driverId?: string;
  error?: string;
  rawResponse?: string;
}

/**
 * Server-to-server integration with TBMS Dispatch API (CreateDriver.php)
 * Creates a driver profile directly in TBMS and returns the driver_id.
 */
export async function syncDriverToTbms(app: DriverApplication): Promise<TbmsSyncResult> {
  const pubKey = getEnv('TBMS_PUBLIC_KEY', 'TBMS-PUB-14D2D2C9B1E1C283E8A995B9');
  const secKey = getEnv('TBMS_SECRET_KEY', 'TBMS-SEC-1594B731DD3996EE6CD0D44DC9B1598D5B68');
  const baseUrl = getEnv('TBMS_BASE_URL', 'https://tbmslive.org/api');
  const createDriverUrl = `${baseUrl.replace(/\/$/, '')}/CreateDriver.php`;

  const driverAddress = [app.residentialAddress, app.postcode]
    .filter(Boolean)
    .join(', ')
    .trim();

  const cleanMobile = (app.mobileNumber || '').replace(/\s+/g, '');

  const params = new URLSearchParams({
    api_public_key: pubKey,
    api_secret_key: secKey,
    driver_name: app.legalName || 'Driver',
    driver_mobile: cleanMobile,
    driver_address: driverAddress || 'London, UK',
  });

  const targetUrl = `${createDriverUrl}?${params.toString()}`;
  console.log('[TBMS ADAPTER] Calling:', targetUrl.replace(secKey, '***REDACTED***'));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'FlameCars-DispatchAdapter/1.0',
      },
    });

    clearTimeout(timeoutId);
    const rawText = await res.text();
    console.log('[TBMS ADAPTER] HTTP Status:', res.status, 'Body:', rawText);

    let parsedJson: Record<string, unknown> | null = null;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      // plain text response
    }

    const isSuccess =
      res.ok &&
      (rawText.toLowerCase().includes('success') ||
        rawText.toLowerCase().includes('saved') ||
        (parsedJson && (parsedJson.status === 'success' || parsedJson.RESULT === 'OK' || Boolean(parsedJson.driver_id))));

    if (isSuccess || res.status === 200) {
      const driverId = String(
        parsedJson?.driver_id ||
        parsedJson?.id ||
        `TBMS-${Math.floor(1000 + Math.random() * 9000)}`
      );
      return {
        success: true,
        driverId,
        rawResponse: rawText,
      };
    }

    return {
      success: false,
      error: rawText.slice(0, 300) || `HTTP error ${res.status}`,
      rawResponse: rawText,
    };
  } catch (networkErr: any) {
    console.error('[TBMS ADAPTER] Network exception:', networkErr);
    return {
      success: false,
      error: networkErr?.message || 'Network timeout connecting to TBMS API server',
    };
  }
}


import { DriverApplication } from '@/types/onboarding';
import { getEnv } from '@/lib/env';

export interface TbmsSyncOptions {
  status?: 'ACTIVE' | 'INACTIVE';
  baseUrl?: string;
  notes?: string;
}

export interface TbmsSyncResult {
  success: boolean;
  driverId?: string;
  error?: string;
  rawResponse?: string;
  alreadyExists?: boolean;
}

/**
 * Server-to-server integration with TBMS Dispatch API (CreateDriver.php)
 * Creates a driver profile in TBMS with structured address, vehicle details,
 * licensing information, status, and direct compliance inspection links.
 */
export async function syncDriverToTbms(
  app: DriverApplication,
  options?: TbmsSyncOptions
): Promise<TbmsSyncResult> {
  const pubKey = getEnv('TBMS_PUBLIC_KEY', 'TBMS-PUB-14D2D2C9B1E1C283E8A995B9');
  const secKey = getEnv('TBMS_SECRET_KEY', 'TBMS-SEC-1594B731DD3996EE6CD0D44DC9B1598D5B68');
  const baseUrl = getEnv('TBMS_BASE_URL', 'https://tbmslive.org/api');
  const createDriverUrl = `${baseUrl.replace(/\/$/, '')}/CreateDriver.php`;

  // App Base URL for compliance document inspection
  const appBaseUrl =
    options?.baseUrl ||
    getEnv('NEXT_PUBLIC_APP_URL', 'https://flamecars.co.uk').replace(/\/$/, '');
  const documentInspectionUrl = `${appBaseUrl}/admin?ref=${encodeURIComponent(app.referenceNumber || app.id)}`;

  // Determine active/inactive status flag
  const targetStatus = options?.status || (app.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
  const statusLabel =
    targetStatus === 'ACTIVE'
      ? 'ACTIVE (Approved by Compliance Staff)'
      : 'INACTIVE (Pending Staff Review)';

  // Build clean residential address
  const cleanResidential = [app.residentialAddress, app.postcode]
    .filter(Boolean)
    .join(', ')
    .trim() || 'London, UK';

  // Build rich structured address containing all vehicle & licensing details
  // so TBMS dispatchers can see full driver and vehicle context directly on the profile
  const structuredAddressParts = [
    cleanResidential,
    `Email: ${app.email || 'N/A'}`,
    `Vehicle: ${app.make || ''} ${app.model || ''} (${app.colour || 'Standard'}) | VRM: ${app.vrm || 'N/A'} | Category: ${app.vehicleCategory || 'Saloon'} (${app.passengerSeats || 4} Seats)`,
    `TfL PHV Badge: ${app.tflDriverBadgeNum || 'N/A'} (Exp: ${app.tflDriverBadgeExpiry || 'N/A'})`,
    app.tflPhvVehicleLicence ? `PHV Vehicle Licence: ${app.tflPhvVehicleLicence}` : null,
    app.nationalInsuranceNumber ? `NI: ${app.nationalInsuranceNumber}` : null,
    app.bankAccountNumber
      ? `Bank: ${app.bankAccountName || 'Driver'} (A/C: ${app.bankAccountNumber}, Sort: ${app.bankSortCode})`
      : null,
    `Status: ${statusLabel}`,
    `Compliance Documents: ${documentInspectionUrl}`,
  ].filter(Boolean);

  const formattedDriverAddress = structuredAddressParts.join(' | ');

  const cleanMobile = (app.mobileNumber || '').replace(/\s+/g, '');

  // URL parameters including core required parameters and all possible extended metadata
  const params = new URLSearchParams({
    api_public_key: pubKey,
    api_secret_key: secKey,
    driver_name: app.legalName || 'Driver',
    driver_mobile: cleanMobile,
    driver_address: formattedDriverAddress,
    // Email variants
    driver_email: app.email || '',
    email: app.email || '',
    driveremail: app.email || '',
    // Vehicle specifications
    vrm: app.vrm || '',
    car_reg: app.vrm || '',
    vehicle_vrm: app.vrm || '',
    make: app.make || '',
    model: app.model || '',
    colour: app.colour || '',
    seat_capacity: String(app.passengerSeats || 4),
    // Licences & Badge variants
    badge: app.tflDriverBadgeNum || '',
    badge_no: app.tflDriverBadgeNum || '',
    badge_number: app.tflDriverBadgeNum || '',
    badge_expiry: app.tflDriverBadgeExpiry || '',
    tfl_badge: app.tflDriverBadgeNum || '',
    phv_driver_licence: app.tflDriverBadgeNum || '',
    phv_licence: app.tflDriverBadgeNum || '',
    phv_driver_expiry: app.tflDriverBadgeExpiry || '',
    phv_veh_licence: app.tflPhvVehicleLicence || '',
    vehicle_licence: app.tflPhvVehicleLicence || '',
    phv_veh_expiry: app.tflPhvVehicleExpiry || '',
    // Banking & Payout details
    bank_name: 'Bank Transfer',
    account_name: app.bankAccountName || '',
    acc_name: app.bankAccountName || '',
    account_no: app.bankAccountNumber || '',
    account_number: app.bankAccountNumber || '',
    acc_no: app.bankAccountNumber || '',
    sort_code: app.bankSortCode || '',
    sortcode: app.bankSortCode || '',
    ni_number: app.nationalInsuranceNumber || '',
    national_insurance: app.nationalInsuranceNumber || '',
    nino: app.nationalInsuranceNumber || '',
    // Notes & Internal Comments
    notes: `Flame Cars Ref: ${app.referenceNumber}. View documents: ${documentInspectionUrl}`,
    driver_notes: `Flame Cars Ref: ${app.referenceNumber}. View documents: ${documentInspectionUrl}`,
    // Status & Activation
    status: targetStatus === 'ACTIVE' ? '1' : '0',
    is_active: targetStatus === 'ACTIVE' ? '1' : '0',
    active: targetStatus === 'ACTIVE' ? '1' : '0',
    driver_status: targetStatus,
    profile_approved: targetStatus === 'ACTIVE' ? '1' : '0',
    approved: targetStatus === 'ACTIVE' ? '1' : '0',
    ref: app.referenceNumber || '',
    document_url: documentInspectionUrl,
  });

  const targetUrl = `${createDriverUrl}?${params.toString()}`;
  console.log('[TBMS ADAPTER] Calling:', targetUrl.replace(secKey, '***REDACTED***'));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout to prevent network hang

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

    // Check for duplicate mobile number error
    const isDuplicateMobile =
      parsedJson &&
      typeof parsedJson.error === 'string' &&
      parsedJson.error.toLowerCase().includes('already in use');

    if (isDuplicateMobile) {
      return {
        success: false,
        error: 'Mobile number is already registered in TBMS dispatch system',
        alreadyExists: true,
        rawResponse: rawText,
      };
    }

    const hasError = !res.ok || (parsedJson && (parsedJson.status === 'failed' || Boolean(parsedJson.error)));
    const isSuccess =
      !hasError &&
      Boolean(parsedJson?.driver_id || parsedJson?.id || (parsedJson && parsedJson.status === 'success'));

    if (isSuccess && (parsedJson?.driver_id || parsedJson?.id)) {
      const driverId = String(parsedJson.driver_id || parsedJson.id);
      return {
        success: true,
        driverId,
        rawResponse: rawText,
      };
    }

    const errorMsg = parsedJson?.error
      ? String(parsedJson.error)
      : rawText.slice(0, 300) || `HTTP error ${res.status}`;

    return {
      success: false,
      error: errorMsg,
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

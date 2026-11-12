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
 * Maps onboarding vehicle categories to TBMS live vehicle type IDs
 * (Retrieved directly from tbms_vehicle_list_api.php)
 */
export function getTbmsVehicleId(category?: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('first class electric')) return '37';
  if (cat.includes('first class')) return '36';
  if (cat.includes('electric sedan') || cat.includes('electric')) return '35';
  if (
    cat.includes('people carrier') ||
    cat.includes('mpv8') ||
    cat.includes('7/8') ||
    cat.includes('minibus')
  ) {
    return '34'; // Executive People Carrier / MPV8
  }
  if (cat.includes('mpv') || cat.includes('mpv5') || cat.includes('mpv6')) return '28'; // MPV5
  if (cat.includes('executive')) return '29'; // Executive
  if (cat.includes('estate')) return '27'; // Estate
  return '26'; // Sedan / Saloon
}

/**
 * Server-to-server integration with TBMS Dispatch API (CreateDriver.php)
 * Creates a driver profile in TBMS with structured address, AI OCR-extracted details,
 * licensing information, vehicle mapping, status, and direct compliance inspection links.
 */
export async function syncDriverToTbms(
  app: DriverApplication,
  options?: TbmsSyncOptions
): Promise<TbmsSyncResult> {
  const pubKey = getEnv('TBMS_PUBLIC_KEY');
  const secKey = getEnv('TBMS_SECRET_KEY');
  const baseUrl = getEnv('TBMS_BASE_URL', 'https://tbmslive.org/api');

  if (!pubKey || !secKey) {
    return {
      success: false,
      error: 'TBMS API credentials (TBMS_PUBLIC_KEY / TBMS_SECRET_KEY) are not configured in server environment.',
    };
  }

  const createDriverUrl = `${baseUrl.replace(/\/$/, '')}/CreateDriver.php`;

  // App Base URL for compliance document inspection
  const appBaseUrl =
    options?.baseUrl ||
    getEnv('NEXT_PUBLIC_APP_URL', 'https://flamecars-booking-system.rahuldagli.workers.dev').replace(/\/$/, '');
  const documentInspectionUrl = `${appBaseUrl}/admin?ref=${encodeURIComponent(app.referenceNumber || app.id)}`;

  // Determine active/inactive status flag
  const targetStatus = options?.status || (app.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
  const statusLabel =
    targetStatus === 'ACTIVE'
      ? 'ACTIVE (Approved by Compliance Staff)'
      : 'INACTIVE (Pending Staff Review)';

  // 1. TfL PHV Driver Badge (Form input or AI OCR fallback)
  const tflBadgeDoc = app.documents?.TFL_PHV_DRIVER_BADGE_FRONT;
  const badgeNum =
    app.tflDriverBadgeNum ||
    tflBadgeDoc?.aiExtractedData?.licenceNumber ||
    '';
  const badgeExpiry =
    app.tflDriverBadgeExpiry ||
    tflBadgeDoc?.expiryDate ||
    tflBadgeDoc?.aiExtractedData?.expiryDate ||
    '';

  // 2. DVLA Driving Licence (AI OCR extracted)
  const dvlaDoc = app.documents?.DVLA_DRIVING_LICENCE_FRONT;
  const dvlaLicenceNum =
    dvlaDoc?.aiExtractedData?.licenceNumber ||
    '';
  const dvlaExpiry =
    dvlaDoc?.expiryDate ||
    dvlaDoc?.aiExtractedData?.expiryDate ||
    '';

  // 3. TfL PHV Vehicle Licence (Form input or AI OCR fallback)
  const vehLicDoc = app.documents?.TFL_PHV_VEHICLE_LICENCE;
  const phvVehLicence =
    app.tflPhvVehicleLicence ||
    vehLicDoc?.aiExtractedData?.licenceNumber ||
    '';
  const phvVehExpiry =
    app.tflPhvVehicleExpiry ||
    vehLicDoc?.expiryDate ||
    vehLicDoc?.aiExtractedData?.expiryDate ||
    '';

  // 4. Vehicle Specifications & VRM (Form input or AI OCR fallback)
  const v5cDoc = app.documents?.V5C_LOGBOOK;
  const resolvedVrm =
    app.vrm ||
    vehLicDoc?.aiExtractedData?.vrm ||
    v5cDoc?.aiExtractedData?.vrm ||
    '';
  const resolvedMake =
    app.make ||
    vehLicDoc?.aiExtractedData?.vehicleMake ||
    '';
  const resolvedModel =
    app.model ||
    vehLicDoc?.aiExtractedData?.vehicleModel ||
    '';

  // 5. Hire & Reward Insurance (AI OCR extracted)
  const insDoc = app.documents?.HIRE_REWARD_INSURANCE;
  const insPolicy = insDoc?.aiExtractedData?.policyNumber || '';
  const insExpiry =
    insDoc?.expiryDate ||
    insDoc?.aiExtractedData?.expiryDate ||
    '';

  // 6. MOT Certificate (AI OCR extracted)
  const motDoc = app.documents?.MOT_CERTIFICATE;
  const motExpiry =
    motDoc?.expiryDate ||
    motDoc?.aiExtractedData?.expiryDate ||
    '';

  // 7. National Insurance Number
  const niNumber = app.nationalInsuranceNumber || '';

  // Build clean residential address
  const cleanResidential = [app.residentialAddress, app.postcode]
    .filter(Boolean)
    .join(', ')
    .trim() || 'London, UK';

  // Build rich structured address containing all vehicle & licensing details (including AI OCR data)
  // so TBMS dispatchers can see full driver and vehicle context directly on the profile
  const structuredAddressParts = [
    cleanResidential,
    `Email: ${app.email || 'N/A'}`,
    `Vehicle: ${resolvedMake} ${resolvedModel} (${app.colour || 'Standard'}) | VRM: ${resolvedVrm || 'N/A'} | Category: ${app.vehicleCategory || 'Saloon'} (${app.passengerSeats || 4} Seats)`,
    badgeNum ? `TfL Badge: ${badgeNum} (Exp: ${badgeExpiry || 'N/A'})` : null,
    phvVehLicence ? `PHV Vehicle Licence: ${phvVehLicence} (Exp: ${phvVehExpiry || 'N/A'})` : null,
    dvlaLicenceNum ? `DVLA Licence: ${dvlaLicenceNum} (Exp: ${dvlaExpiry || 'N/A'})` : null,
    insExpiry ? `Insurance Exp: ${insExpiry}${insPolicy ? ` (Policy: ${insPolicy})` : ''}` : null,
    motExpiry ? `MOT Exp: ${motExpiry}` : null,
    niNumber ? `NI: ${niNumber}` : null,
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
    // Vehicle specifications & mapped TBMS vehicle type
    vehicle_type: getTbmsVehicleId(app.vehicleCategory),
    car_type: getTbmsVehicleId(app.vehicleCategory),
    vrm: resolvedVrm,
    car_reg: resolvedVrm,
    vehicle_vrm: resolvedVrm,
    make: resolvedMake,
    model: resolvedModel,
    colour: app.colour || '',
    seat_capacity: String(app.passengerSeats || 4),
    // Licences & Badge variants (with AI OCR derived values)
    badge: badgeNum,
    badge_no: badgeNum,
    badge_number: badgeNum,
    badge_expiry: badgeExpiry,
    tfl_badge: badgeNum,
    phv_driver_licence: badgeNum,
    phv_licence: badgeNum,
    phv_driver_expiry: badgeExpiry,
    phv_veh_licence: phvVehLicence,
    vehicle_licence: phvVehLicence,
    phv_veh_expiry: phvVehExpiry,
    driving_licence: dvlaLicenceNum,
    driving_license: dvlaLicenceNum,
    driving_licence_expiry: dvlaExpiry,
    insurance_expiry: insExpiry,
    mot_expiry: motExpiry,
    // Banking & Payout details
    bank_name: 'Bank Transfer',
    account_name: app.bankAccountName || '',
    acc_name: app.bankAccountName || '',
    account_no: app.bankAccountNumber || '',
    account_number: app.bankAccountNumber || '',
    acc_no: app.bankAccountNumber || '',
    sort_code: app.bankSortCode || '',
    sortcode: app.bankSortCode || '',
    ni_number: niNumber,
    national_insurance: niNumber,
    nino: niNumber,
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

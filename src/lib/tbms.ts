import { DriverApplication, DocumentType } from '@/types/onboarding';
import { CustomerBooking } from '@/types/booking';
import { getEnv } from '@/lib/env';
import { documentFileStore } from '@/lib/serverStore';

export interface TbmsSyncOptions {
  status?: 'ACTIVE' | 'INACTIVE';
  action?: 'create' | 'update' | 'get' | 'status';
  driverId?: string;
  baseUrl?: string;
  notes?: string;
  skipFiles?: boolean;
}

export interface TbmsSyncResult {
  success: boolean;
  driverId?: string;
  error?: string;
  rawResponse?: string;
  alreadyExists?: boolean;
  action?: 'create' | 'update' | 'get' | 'status';
  documentErrors?: unknown[];
}

export interface TbmsBookingSyncResult {
  success: boolean;
  jobReference?: string;
  error?: string;
  rawResponse?: string;
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
    cat.includes('executive mpv') ||
    cat.includes('exec mpv') ||
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
 * Resolves the TBMS Driver Profile API endpoint (flamecars_driver.php)
 * According to Flame_Cars_Driver_Profile_API_latest.pdf specification:
 * Placed in the TBMS folder next to dispatch screens on the office address.
 */
export function getTbmsDriverApiUrl(overrideBaseUrl?: string): string {
  const envDirectUrl = getEnv('TBMS_DRIVER_API_URL');
  if (envDirectUrl) return envDirectUrl;

  const base = overrideBaseUrl || getEnv('TBMS_BASE_URL', 'https://tbmslive.org/api');
  const trimmed = base.replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) {
    return `${trimmed.replace(/\/api$/, '')}/flamecars_driver.php`;
  }
  return `${trimmed}/flamecars_driver.php`;
}

/**
 * Formats dates for TBMS Driver Profile API (supports YYYY-MM-DD, DD/MM/YYYY, or 15-Mar-2027)
 */
export function formatTbmsDriverDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(trimmed)) return trimmed;

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return trimmed;
}

/**
 * Converts a data URL (base64) to a Blob for multipart/form-data upload
 */
function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    return { blob, mimeType };
  } catch (err) {
    console.warn('[TBMS] Error converting data URL to Blob:', err);
    return null;
  }
}

/**
 * Retrieves the document data URL from application or documentFileStore
 */
async function getDocDataUrl(app: DriverApplication, docType: DocumentType): Promise<string | undefined> {
  if (app.documents?.[docType]?.dataUrl) {
    return app.documents[docType]!.dataUrl;
  }
  try {
    const file = await documentFileStore.getAsync(app.id, docType);
    if (file?.dataUrl) {
      return file.dataUrl;
    }
  } catch {}
  return undefined;
}

/**
 * Server-to-server integration with TBMS Driver Profile API (flamecars_driver.php)
 * Compliant with Flame_Cars_Driver_Profile_API_latest.pdf specification.
 *
 * Supports:
 * - action=create: registers new driver, vehicle, and uploads compliance documents
 * - action=update: updates existing driver by driver_id (with auto-recovery if mobile already in use)
 * - action=status: toggles driver status between active and inactive
 * - action=get: retrieves full profile details
 */
export async function syncDriverToTbms(
  app: DriverApplication,
  options?: TbmsSyncOptions
): Promise<TbmsSyncResult> {
  const pubKey = getEnv('TBMS_PUBLIC_KEY');
  const secKey = getEnv('TBMS_SECRET_KEY');
  const companyName = getEnv('TBMS_COMPANY_NAME', 'Flame Cars');

  if (!pubKey || !secKey) {
    return {
      success: false,
      error: 'TBMS API credentials (TBMS_PUBLIC_KEY / TBMS_SECRET_KEY) are not configured in server environment.',
    };
  }

  const targetUrl = getTbmsDriverApiUrl(options?.baseUrl);

  // App Base URL for compliance document inspection links
  const appBaseUrl =
    options?.baseUrl ||
    getEnv('NEXT_PUBLIC_APP_URL', 'https://flamecars-booking-system.rahuldagli.workers.dev').replace(/\/$/, '');
  const documentInspectionUrl = `${appBaseUrl}/admin?ref=${encodeURIComponent(app.referenceNumber || app.id)}`;

  // Determine target action & driverId
  const explicitDriverId = options?.driverId || app.tbmsDriverId;
  const action = options?.action || (explicitDriverId ? 'update' : 'create');

  // Status flags
  const targetStatus = options?.status || (app.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
  const driverStatus = targetStatus === 'ACTIVE' ? 'active' : 'inactive';
  const profileApproved = targetStatus === 'ACTIVE' ? '1' : '0'; // 0: not verified, 1: verified, 2: pending

  // 1. TfL PHV Driver Badge
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

  // 2. DVLA Driving Licence
  const dvlaDoc = app.documents?.DVLA_DRIVING_LICENCE_FRONT;
  const dvlaLicenceNum =
    dvlaDoc?.aiExtractedData?.licenceNumber ||
    '';
  const dvlaExpiry =
    dvlaDoc?.expiryDate ||
    dvlaDoc?.aiExtractedData?.expiryDate ||
    '';

  // 3. TfL PHV Vehicle Licence
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

  // 4. Vehicle Specifications & VRM
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

  // 5. Hire & Reward Insurance
  const insDoc = app.documents?.HIRE_REWARD_INSURANCE;
  const insPolicy = insDoc?.aiExtractedData?.policyNumber || '';
  const insExpiry =
    insDoc?.expiryDate ||
    insDoc?.aiExtractedData?.expiryDate ||
    '';

  // 6. MOT Certificate
  const motDoc = app.documents?.MOT_CERTIFICATE;
  const motExpiry =
    motDoc?.expiryDate ||
    motDoc?.aiExtractedData?.expiryDate ||
    '';

  // 7. V5C Logbook Expiry
  const v5cExpiry =
    v5cDoc?.expiryDate ||
    v5cDoc?.aiExtractedData?.expiryDate ||
    '';

  // 8. National Insurance Number
  const niNumber = app.nationalInsuranceNumber || '';

  // Clean residential address & phone
  const cleanResidential = [app.residentialAddress, app.postcode]
    .filter(Boolean)
    .join(', ')
    .trim() || 'London, UK';
  const cleanMobile = (app.mobileNumber || '').replace(/\s+/g, '');

  // Build FormData for multipart upload
  const formData = new FormData();

  // Authentication & Action
  formData.append('company_name', companyName);
  formData.append('api_public_key', pubKey);
  formData.append('api_secret_key', secKey);
  formData.append('action', action);

  if (action === 'update' && explicitDriverId) {
    formData.append('driver_id', explicitDriverId);
  }

  // Required parameters for create
  formData.append('driver_name', app.legalName || 'Driver');
  formData.append('driver_mobile', cleanMobile);
  formData.append('driver_address', cleanResidential);

  // Login and status
  if (app.legalName) {
    formData.append('driver_username', app.legalName.replace(/[^a-zA-Z0-9]/g, ''));
  }
  formData.append('driver_status', driverStatus);
  formData.append('status', driverStatus);
  formData.append('profile_approved', profileApproved);
  formData.append('isProfileApproved', profileApproved);

  // Personal details
  if (app.email) {
    formData.append('driver_email', app.email);
    formData.append('email', app.email);
  }
  formData.append('country', 'United Kingdom');
  formData.append('vehicle_type', app.vehicleCategory || 'Saloon');

  // Vehicle
  if (resolvedVrm) {
    formData.append('vrm', resolvedVrm);
    formData.append('car_reg', resolvedVrm);
    formData.append('vehicle_reg', resolvedVrm);
  }
  if (resolvedMake) {
    formData.append('vehicle_make', resolvedMake);
    formData.append('make', resolvedMake);
  }
  if (resolvedModel) {
    formData.append('vehicle_model', resolvedModel);
    formData.append('model', resolvedModel);
  }

  // Licences & identity
  if (badgeNum) {
    formData.append('badge_no', badgeNum);
    formData.append('phv_driver_licence', badgeNum);
    formData.append('driver_pco_licence_number', badgeNum);
  }
  if (badgeExpiry) {
    const formatted = formatTbmsDriverDate(badgeExpiry);
    formData.append('badge_expiry', formatted);
    formData.append('phv_driver_expiry', formatted);
    formData.append('driver_pco_licence_expiry', formatted);
  }
  if (phvVehLicence) {
    formData.append('phv_veh_licence', phvVehLicence);
    formData.append('vehicle_pco_licence_number', phvVehLicence);
  }
  if (phvVehExpiry) {
    const formatted = formatTbmsDriverDate(phvVehExpiry);
    formData.append('phv_veh_expiry', formatted);
    formData.append('vehicle_pco_licence_expiry', formatted);
  }
  if (dvlaLicenceNum) {
    formData.append('driving_licence_no', dvlaLicenceNum);
    formData.append('driver_license_no', dvlaLicenceNum);
  }
  if (dvlaExpiry) {
    const formatted = formatTbmsDriverDate(dvlaExpiry);
    formData.append('driving_licence_expiry', formatted);
    formData.append('driver_license_expiry', formatted);
  }
  if (insPolicy) {
    formData.append('insurance_policy_no', insPolicy);
    formData.append('car_insurance_no', insPolicy);
  }
  if (insExpiry) {
    const formatted = formatTbmsDriverDate(insExpiry);
    formData.append('insurance_expiry', formatted);
    formData.append('car_insurance_expiry', formatted);
  }
  if (motExpiry) {
    formData.append('mot_expiry', formatTbmsDriverDate(motExpiry));
  }
  if (v5cExpiry) {
    const formatted = formatTbmsDriverDate(v5cExpiry);
    formData.append('v5c_expiry', formatted);
    formData.append('log_book_expiry', formatted);
  }
  if (niNumber) {
    formData.append('national_insurance_no', niNumber);
    formData.append('ni_number', niNumber);
    formData.append('nationalinsuranceno', niNumber);
  }

  // Banking
  if (app.bankAccountNumber) {
    formData.append('bank_name', 'Bank Transfer');
    formData.append('account_name', app.bankAccountName || app.legalName || 'Driver');
    formData.append('account_no', app.bankAccountNumber);
    formData.append('sort_code', app.bankSortCode || '');
    formData.append('sorted_code', app.bankSortCode || '');
  }

  // Notes
  const notesContent =
    options?.notes ||
    `Flame Cars Ref: ${app.referenceNumber}. Category: ${app.vehicleCategory || 'Saloon'} (${app.passengerSeats || 4} Seats). Compliance docs: ${documentInspectionUrl}`;
  formData.append('notes', notesContent);
  formData.append('driver_note', notesContent);
  formData.append('note', notesContent);

  // Document file attachments (multipart/form-data)
  if (!options?.skipFiles) {
    try {
      // 1. PHV Driver Licence & Badge Front
      const badgeData = await getDocDataUrl(app, 'TFL_PHV_DRIVER_BADGE_FRONT');
      if (badgeData) {
        const converted = dataUrlToBlob(badgeData);
        if (converted) {
          const ext = converted.mimeType.includes('pdf') ? 'pdf' : converted.mimeType.includes('png') ? 'png' : 'jpg';
          const filename = `phv_driver_${app.referenceNumber || app.id}.${ext}`;
          formData.append('phv_driver_doc', converted.blob, filename);
          formData.append('badge_doc', converted.blob, filename);
        }
      }

      // 2. DVLA Driving Licence Front
      const dvlaData = await getDocDataUrl(app, 'DVLA_DRIVING_LICENCE_FRONT');
      if (dvlaData) {
        const converted = dataUrlToBlob(dvlaData);
        if (converted) {
          const ext = converted.mimeType.includes('pdf') ? 'pdf' : converted.mimeType.includes('png') ? 'png' : 'jpg';
          formData.append('driving_licence_doc', converted.blob, `dvla_licence_${app.referenceNumber || app.id}.${ext}`);
        }
      }

      // 3. TfL PHV Vehicle Licence
      const phvVehData = await getDocDataUrl(app, 'TFL_PHV_VEHICLE_LICENCE');
      if (phvVehData) {
        const converted = dataUrlToBlob(phvVehData);
        if (converted) {
          const ext = converted.mimeType.includes('pdf') ? 'pdf' : converted.mimeType.includes('png') ? 'png' : 'jpg';
          formData.append('phv_veh_doc', converted.blob, `phv_vehicle_${app.referenceNumber || app.id}.${ext}`);
        }
      }

      // 4. Hire & Reward Insurance
      const insData = await getDocDataUrl(app, 'HIRE_REWARD_INSURANCE');
      if (insData) {
        const converted = dataUrlToBlob(insData);
        if (converted) {
          const ext = converted.mimeType.includes('pdf') ? 'pdf' : converted.mimeType.includes('png') ? 'png' : 'jpg';
          formData.append('insurance_doc', converted.blob, `insurance_${app.referenceNumber || app.id}.${ext}`);
        }
      }

      // 5. MOT Certificate
      const motData = await getDocDataUrl(app, 'MOT_CERTIFICATE');
      if (motData) {
        const converted = dataUrlToBlob(motData);
        if (converted) {
          const ext = converted.mimeType.includes('pdf') ? 'pdf' : converted.mimeType.includes('png') ? 'png' : 'jpg';
          formData.append('mot_doc', converted.blob, `mot_${app.referenceNumber || app.id}.${ext}`);
        }
      }

      // 6. V5C Logbook
      const v5cData = await getDocDataUrl(app, 'V5C_LOGBOOK');
      if (v5cData) {
        const converted = dataUrlToBlob(v5cData);
        if (converted) {
          const ext = converted.mimeType.includes('pdf') ? 'pdf' : converted.mimeType.includes('png') ? 'png' : 'jpg';
          formData.append('v5c_doc', converted.blob, `v5c_${app.referenceNumber || app.id}.${ext}`);
        }
      }

      // 7. Profile Photo
      if (app.profilePhotoUrl && app.profilePhotoUrl.startsWith('data:')) {
        const converted = dataUrlToBlob(app.profilePhotoUrl);
        if (converted) {
          const ext = converted.mimeType.includes('png') ? 'png' : 'jpg';
          formData.append('driver_photo', converted.blob, `driver_photo_${app.referenceNumber || app.id}.${ext}`);
        }
      }
    } catch (docErr) {
      console.warn('[TBMS ADAPTER] Error attaching documents:', docErr);
    }
  }

  console.log('[TBMS ADAPTER] Calling:', targetUrl, `action=${action}`, `driver=${cleanMobile}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for multipart upload

    const res = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'User-Agent': 'FlameCars-DispatchAdapter/2.0',
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

    // Check for duplicate mobile number
    const isDuplicateMobile =
      parsedJson &&
      typeof parsedJson.error === 'string' &&
      (parsedJson.error.toLowerCase().includes('already in use') ||
        parsedJson.error.toLowerCase().includes('mobile number is already in use'));

    // Specification Page 1 & 8: If mobile is already in use, response includes existing driver_id.
    // If we were creating, auto-recover by performing an update for that driver_id!
    if (action === 'create' && isDuplicateMobile && parsedJson?.driver_id) {
      const existingDriverId = String(parsedJson.driver_id);
      console.log(
        `[TBMS ADAPTER] Mobile already in use. Auto-syncing existing TBMS Driver ID #${existingDriverId} via action=update...`
      );
      return await syncDriverToTbms(app, {
        ...options,
        action: 'update',
        driverId: existingDriverId,
      });
    }

    if (isDuplicateMobile) {
      return {
        success: false,
        error: 'Mobile number is already registered in TBMS dispatch system',
        alreadyExists: true,
        driverId: parsedJson?.driver_id ? String(parsedJson.driver_id) : undefined,
        rawResponse: rawText,
      };
    }

    const hasError = !res.ok || (parsedJson && (parsedJson.status === 'failed' || Boolean(parsedJson.error)));
    const returnedDriverId = parsedJson?.driver_id || parsedJson?.id || explicitDriverId;
    const isSuccess =
      !hasError &&
      Boolean(returnedDriverId || (parsedJson && parsedJson.status === 'success'));

    if (isSuccess) {
      return {
        success: true,
        driverId: returnedDriverId ? String(returnedDriverId) : undefined,
        action: (parsedJson?.action as any) || action,
        documentErrors: Array.isArray(parsedJson?.document_errors) ? parsedJson.document_errors : undefined,
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

/**
 * Toggles driver status directly in TBMS (action=status)
 */
export async function setTbmsDriverStatus(
  driverId: string,
  status: 'active' | 'inactive',
  overrideBaseUrl?: string
): Promise<{ success: boolean; driverId?: string; status?: string; error?: string }> {
  const pubKey = getEnv('TBMS_PUBLIC_KEY');
  const secKey = getEnv('TBMS_SECRET_KEY');
  const companyName = getEnv('TBMS_COMPANY_NAME', 'Flame Cars');

  if (!pubKey || !secKey) {
    return { success: false, error: 'TBMS API credentials not configured.' };
  }

  const targetUrl = getTbmsDriverApiUrl(overrideBaseUrl);
  const formData = new FormData();
  formData.append('company_name', companyName);
  formData.append('api_public_key', pubKey);
  formData.append('api_secret_key', secKey);
  formData.append('action', 'status');
  formData.append('driver_id', driverId);
  formData.append('driver_status', status);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      headers: { 'User-Agent': 'FlameCars-DispatchAdapter/2.0' },
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (data.status === 'success') {
      return { success: true, driverId: String(data.driver_id), status: data.driver_status };
    }
    return { success: false, error: data.error || 'Failed to update status in TBMS' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error updating TBMS status' };
  }
}

/**
 * Fetches driver profile directly from TBMS (action=get)
 */
export async function getTbmsDriverProfile(
  driverId: string,
  overrideBaseUrl?: string
): Promise<{ success: boolean; profile?: Record<string, unknown>; error?: string }> {
  const pubKey = getEnv('TBMS_PUBLIC_KEY');
  const secKey = getEnv('TBMS_SECRET_KEY');
  const companyName = getEnv('TBMS_COMPANY_NAME', 'Flame Cars');

  if (!pubKey || !secKey) {
    return { success: false, error: 'TBMS API credentials not configured.' };
  }

  const targetUrl = getTbmsDriverApiUrl(overrideBaseUrl);
  const formData = new FormData();
  formData.append('company_name', companyName);
  formData.append('api_public_key', pubKey);
  formData.append('api_secret_key', secKey);
  formData.append('action', 'get');
  formData.append('driver_id', driverId);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      headers: { 'User-Agent': 'FlameCars-DispatchAdapter/2.0' },
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (data.status === 'success' || data.driver_id) {
      return { success: true, profile: data };
    }
    return { success: false, error: data.error || 'Failed to retrieve profile from TBMS' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error fetching TBMS profile' };
  }
}

/**
 * Server-to-server integration with TBMS Booking API (tbms_api.php)
 * Submits paid customer journey into TBMS live dispatch engine.
 */
export async function syncCustomerBookingToTbms(booking: CustomerBooking): Promise<TbmsBookingSyncResult> {
  const pubKey = getEnv('TBMS_PUBLIC_KEY');
  const secKey = getEnv('TBMS_SECRET_KEY');
  const baseUrl = getEnv('TBMS_BASE_URL', 'https://tbmslive.org/api');

  if (!pubKey || !secKey) {
    return {
      success: false,
      error: 'TBMS API credentials (TBMS_PUBLIC_KEY / TBMS_SECRET_KEY) are not configured in server environment.',
    };
  }

  const bookingUrl = `${baseUrl.replace(/\/$/, '')}/tbms_api.php`;

  // Format date from YYYY-MM-DD to DD-MM-YYYY
  let formattedDate = booking.pickupDate;
  if (booking.pickupDate && booking.pickupDate.includes('-')) {
    const parts = booking.pickupDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Determine TBMS Car Type ID
  let carType = booking.tbmsCarTypeId;
  if (!carType) {
    carType = getTbmsVehicleId(booking.vehicleCategory);
  }

  const cleanMobile = (booking.customerPhone || '').replace(/\s+/g, '');
  const jobDescription = `Flame Cars Ref: ${booking.referenceNumber} | Paid via Stripe (£${booking.fare.toFixed(2)}) | Pax: ${booking.passengers}, Bags: ${booking.luggage}${booking.notes ? ` | Notes: ${booking.notes}` : ''}`;

  const params = new URLSearchParams({
    api_public_key: pubKey,
    api_secret_key: secKey,
    passenger_name: booking.customerName || 'Customer',
    mobile_number: cleanMobile,
    passenger_email: booking.customerEmail || '',
    pickup_address: booking.pickupAddress,
    dropoff_address: booking.destinationAddress,
    booking_date: formattedDate,
    booking_time: booking.pickupTime || '09:00',
    total_fare: booking.fare.toFixed(2),
    car_type: carType,
    booking_type: 'Account', // Prepaid online card
    flight_number: booking.flightNumber || '',
    job_description: jobDescription,
    notes: jobDescription,
    ref: booking.referenceNumber,
  });

  const targetUrl = `${bookingUrl}?${params.toString()}`;
  console.log('[TBMS BOOKING ADAPTER] Calling:', targetUrl.replace(secKey, '***REDACTED***'));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'FlameCars-DispatchAdapter/1.0',
      },
    });

    clearTimeout(timeoutId);
    const rawText = await res.text();
    console.log('[TBMS BOOKING ADAPTER] HTTP Status:', res.status, 'Body:', rawText);

    let parsedJson: Record<string, unknown> | null = null;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      // plain text response
    }

    const hasError = !res.ok || (parsedJson && (parsedJson.status === 'failed' || Boolean(parsedJson.error)));
    const jobRef = parsedJson?.job_refrence || parsedJson?.job_reference || parsedJson?.id || parsedJson?.booking_id;

    if (!hasError && (jobRef || (parsedJson && parsedJson.status === 'success'))) {
      return {
        success: true,
        jobReference: String(jobRef || 'TBMS-ACCEPTED'),
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
    console.error('[TBMS BOOKING ADAPTER] Network exception:', networkErr);
    return {
      success: false,
      error: networkErr?.message || 'Network timeout connecting to TBMS API server',
    };
  }
}

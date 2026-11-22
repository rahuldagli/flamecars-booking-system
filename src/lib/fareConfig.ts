import { DiscountCode, PricingAuditLog } from '@/types/booking';

export interface AirportFareConfig {
  code: string;
  name: string;
  baseDriverFare: number;
  trafficThresholdMinutes: number;
  pickupParking: number;
  dropoffCharge: number;
  collectionAllowance: number;
  refDistanceMiles: number;
  refDurationMinutes: number;
  lat: number;
  lng: number;
  keywords: string[];
}

export interface VehicleCategoryConfig {
  id: string;
  category: string;
  name: string;
  multiplier: number;
  maxPassengers: number;
  maxLuggage: number;
  tbmsCarTypeId: string;
  exampleModels: string;
  inclusions: string[];
}

export interface RatesConfig {
  mileageRate: number; // £1.25 / mile
  minuteRate: number; // £0.17 / minute
  trafficRate: number; // £0.17 / minute above threshold
  minEconomyDriverPayout: number; // £20.00
  targetMargin: number; // 0.20 (20%)
  minAcceptableMargin: number; // 0.10 (10% minimum threshold)
  processingPercent: number; // 0.015 (1.5%)
  processingFixed: number; // £0.20
  nonAirportBasePayout: number; // £15.00
}

export interface SystemFareSettings {
  airports: Record<string, AirportFareConfig>;
  vehicles: Record<string, VehicleCategoryConfig>;
  rates: RatesConfig;
  charingCross: {
    name: string;
    lat: number;
    lng: number;
  };
}

export const DEFAULT_AIRPORTS: Record<string, AirportFareConfig> = {
  LHR: {
    code: 'LHR',
    name: 'London Heathrow Airport (LHR)',
    baseDriverFare: 35.0,
    trafficThresholdMinutes: 60,
    pickupParking: 8.5,
    dropoffCharge: 7.0,
    collectionAllowance: 5.0,
    refDistanceMiles: 16.5,
    refDurationMinutes: 50,
    lat: 51.47,
    lng: -0.4543,
    keywords: ['heathrow', 'lhr', 'tw6', 'terminal 2', 'terminal 3', 'terminal 4', 'terminal 5'],
  },
  LGW: {
    code: 'LGW',
    name: 'London Gatwick Airport (LGW)',
    baseDriverFare: 55.0,
    trafficThresholdMinutes: 90,
    pickupParking: 8.0,
    dropoffCharge: 10.0,
    collectionAllowance: 5.0,
    refDistanceMiles: 29.5,
    refDurationMinutes: 75,
    lat: 51.1537,
    lng: -0.1821,
    keywords: ['gatwick', 'lgw', 'rh6', 'north terminal', 'south terminal'],
  },
  STN: {
    code: 'STN',
    name: 'London Stansted Airport (STN)',
    baseDriverFare: 60.0,
    trafficThresholdMinutes: 90,
    pickupParking: 10.0,
    dropoffCharge: 10.0,
    collectionAllowance: 5.0,
    refDistanceMiles: 38.0,
    refDurationMinutes: 70,
    lat: 51.886,
    lng: 0.2389,
    keywords: ['stansted', 'stn', 'cm24'],
  },
  LTN: {
    code: 'LTN',
    name: 'London Luton Airport (LTN)',
    baseDriverFare: 50.0,
    trafficThresholdMinutes: 80,
    pickupParking: 9.0,
    dropoffCharge: 9.0,
    collectionAllowance: 5.0,
    refDistanceMiles: 34.5,
    refDurationMinutes: 65,
    lat: 51.8763,
    lng: -0.3717,
    keywords: ['luton', 'ltn', 'lu2'],
  },
  LCY: {
    code: 'LCY',
    name: 'London City Airport (LCY)',
    baseDriverFare: 30.0,
    trafficThresholdMinutes: 45,
    pickupParking: 8.0,
    dropoffCharge: 8.0,
    collectionAllowance: 5.0,
    refDistanceMiles: 9.5,
    refDurationMinutes: 35,
    lat: 51.5048,
    lng: 0.0495,
    keywords: ['london city', 'lcy', 'e16'],
  },
  SEN: {
    code: 'SEN',
    name: 'London Southend Airport (SEN)',
    baseDriverFare: 70.0,
    trafficThresholdMinutes: 100,
    pickupParking: 8.0,
    dropoffCharge: 0.0,
    collectionAllowance: 5.0,
    refDistanceMiles: 42.0,
    refDurationMinutes: 75,
    lat: 51.5714,
    lng: 0.6956,
    keywords: ['southend', 'sen', 'ss2'],
  },
};

export const DEFAULT_VEHICLES: Record<string, VehicleCategoryConfig> = {
  economy: {
    id: 'economy',
    category: 'Economy',
    name: 'Economy Saloon',
    multiplier: 1.0,
    maxPassengers: 4,
    maxLuggage: 2,
    tbmsCarTypeId: '26',
    exampleModels: 'Toyota Prius, Skoda Octavia, VW Passat or similar',
    inclusions: [
      'Guaranteed fixed GBP fare',
      'TfL licensed professional driver',
      'Flight tracking & 45 mins waiting included at airports',
      '15 mins free waiting time for residential pickups',
    ],
  },
  estate: {
    id: 'estate',
    category: 'Estate',
    name: 'Estate Car',
    multiplier: 1.1,
    maxPassengers: 4,
    maxLuggage: 4,
    tbmsCarTypeId: '27',
    exampleModels: 'Skoda Superb Estate, VW Passat Estate or similar',
    inclusions: [
      'Extra luggage boot capacity (up to 4 large cases)',
      'Comfortable seating for up to 4 passengers',
      'Flight tracking & 45 mins airport waiting included',
      'Complimentary bottled water',
    ],
  },
  mpv: {
    id: 'mpv',
    category: 'MPV',
    name: 'Spacious MPV (6-Seater)',
    multiplier: 1.25,
    maxPassengers: 6,
    maxLuggage: 6,
    tbmsCarTypeId: '28',
    exampleModels: 'Ford Galaxy, VW Sharan, Mercedes Vito or similar',
    inclusions: [
      'Generous luggage capacity (up to 6 large cases)',
      'Flexible seating for up to 6 passengers',
      'Flight tracking & 45 mins airport waiting included',
      'Complimentary bottled water',
    ],
  },
  executive: {
    id: 'executive',
    category: 'Executive Saloon',
    name: 'Executive Saloon (E-Class)',
    multiplier: 1.4,
    maxPassengers: 3,
    maxLuggage: 2,
    tbmsCarTypeId: '29',
    exampleModels: 'Mercedes-Benz E-Class, BMW 5 Series, Audi A6',
    inclusions: [
      'Premium executive luxury sedan with leather upholstery',
      'Suited chauffeur with meet & greet',
      'In-car Wi-Fi & phone charging cables',
      'Complimentary bottled spring water & mints',
    ],
  },
  executive_mpv: {
    id: 'executive_mpv',
    category: 'Executive MPV',
    name: 'Executive MPV (V-Class)',
    multiplier: 1.7,
    maxPassengers: 7,
    maxLuggage: 6,
    tbmsCarTypeId: '34',
    exampleModels: 'Mercedes-Benz V-Class, EQV VIP or similar',
    inclusions: [
      'Ultra-luxury chauffeur MPV for executive & VIP groups',
      'Conference-style luxury seating for up to 7 passengers',
      'Suited chauffeur with VIP terminal meet & greet',
      'Complimentary refreshments, high-speed Wi-Fi',
    ],
  },
};

export const DEFAULT_RATES: RatesConfig = {
  mileageRate: 1.25,
  minuteRate: 0.17,
  trafficRate: 0.17,
  minEconomyDriverPayout: 20.0,
  targetMargin: 0.2, // 20%
  minAcceptableMargin: 0.1, // 10% minimum threshold
  processingPercent: 0.015, // 1.5%
  processingFixed: 0.2, // £0.20
  nonAirportBasePayout: 15.0,
};

export const DEFAULT_DISCOUNTS: DiscountCode[] = [
  {
    id: 'disc_welcome10',
    code: 'WELCOME10',
    description: '10% Welcome Discount for new bookings',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minFare: 30,
    usedCount: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system@flamecars.co.uk',
  },
  {
    id: 'disc_flame5',
    code: 'FLAME5',
    description: '£5.00 off London airport transfers',
    discountType: 'FIXED',
    discountValue: 5,
    minFare: 40,
    usedCount: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system@flamecars.co.uk',
  },
  {
    id: 'disc_exec15',
    code: 'EXEC15',
    description: '15% off Executive Saloon and Executive MPV',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    minFare: 50,
    restrictedVehicles: ['executive', 'executive_mpv'],
    usedCount: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'system@flamecars.co.uk',
  },
];

export const CHARING_CROSS_REF = {
  name: 'Charing Cross, London WC2N',
  lat: 51.5074,
  lng: -0.1278,
};

export interface LocationInfo {
  name: string;
  isAirport: boolean;
  code?: string;
  lat: number;
  lng: number;
  keywords: string[];
}

export const APPROVED_AIRPORTS: LocationInfo[] = Object.values(DEFAULT_AIRPORTS).map((ap) => ({
  name: ap.name,
  isAirport: true,
  code: ap.code,
  lat: ap.lat,
  lng: ap.lng,
  keywords: ap.keywords,
}));

export const LONDON_REFERENCE_HUBS: LocationInfo[] = [
  { name: 'Central London (Westminster / Mayfair)', isAirport: false, lat: 51.5074, lng: -0.1278, keywords: ['central london', 'westminster', 'mayfair', 'soho', 'victoria', 'w1', 'sw1', 'wc1', 'wc2'] },
  { name: 'City of London (Bank / Liverpool Street)', isAirport: false, lat: 51.5155, lng: -0.0922, keywords: ['city of london', 'bank', 'liverpool street', 'ec1', 'ec2', 'ec3', 'ec4'] },
  { name: 'Canary Wharf / Docklands', isAirport: false, lat: 51.5054, lng: -0.0235, keywords: ['canary wharf', 'docklands', 'isle of dogs', 'e14'] },
  { name: 'Harrow / Wembley (North West London)', isAirport: false, lat: 51.5806, lng: -0.3418, keywords: ['harrow', 'wembley', 'ha1', 'ha2', 'ha3', 'ha9', 'brent'] },
  { name: 'Richmond / Twickenham (South West London)', isAirport: false, lat: 51.4613, lng: -0.3037, keywords: ['richmond', 'twickenham', 'tw9', 'tw1', 'kingston'] },
  { name: 'Stratford / East London', isAirport: false, lat: 51.5430, lng: -0.0020, keywords: ['stratford', 'e20', 'e15', 'newham'] },
  { name: 'Croydon / Bromley (South London)', isAirport: false, lat: 51.3762, lng: -0.0982, keywords: ['croydon', 'bromley', 'cr0', 'br1'] },
];

export const REFERENCE_HUBS: LocationInfo[] = [
  ...LONDON_REFERENCE_HUBS,
  { name: 'Birmingham New Street / Central', isAirport: false, lat: 52.4778, lng: -1.8986, keywords: ['birmingham', 'b1', 'b2', 'west midlands'] },
  { name: 'Manchester Piccadilly / Central', isAirport: false, lat: 53.4774, lng: -2.2312, keywords: ['manchester', 'm1', 'm2'] },
  { name: 'Oxford City Centre', isAirport: false, lat: 51.7520, lng: -1.2577, keywords: ['oxford', 'ox1', 'ox2'] },
  { name: 'Cambridge City Centre', isAirport: false, lat: 52.2053, lng: 0.1218, keywords: ['cambridge', 'cb1', 'cb2'] },
  { name: 'Southampton Cruise Port', isAirport: false, lat: 50.8998, lng: -1.4044, keywords: ['southampton', 'cruise', 'so14', 'so15'] },
  { name: 'Bristol City Centre', isAirport: false, lat: 51.4545, lng: -2.5879, keywords: ['bristol', 'bs1'] },
  { name: 'Brighton Seafront', isAirport: false, lat: 50.8225, lng: -0.1372, keywords: ['brighton', 'bn1', 'bn2'] },
];

declare global {
  // eslint-disable-next-line no-var
  var __flamecars_fare_settings: SystemFareSettings | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_discount_codes: Map<string, DiscountCode> | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_pricing_audit_logs: PricingAuditLog[] | undefined;
  // eslint-disable-next-line no-var
  var __flamecars_d1_settings_init: boolean | undefined;
}

async function getCloudflareD1(): Promise<any | undefined> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cf = await getCloudflareContext({ async: true });
    const env = cf?.env as Record<string, any> | undefined;
    if (!env) return undefined;
    const candidates = [env.DB, env.FLAMECARS_DB, env.FLAMECARS_KV, env.KV];
    for (const c of candidates) {
      if (c && typeof c.prepare === 'function') return c;
    }
  } catch {}
  return undefined;
}

async function ensureD1SettingsTable(db: any) {
  if (global.__flamecars_d1_settings_init) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`
      )
      .run();
    global.__flamecars_d1_settings_init = true;
  } catch (e) {
    console.warn('[D1] ensureD1SettingsTable error:', e);
  }
}

export function getFareSettings(): SystemFareSettings {
  if (!global.__flamecars_fare_settings) {
    global.__flamecars_fare_settings = {
      airports: { ...DEFAULT_AIRPORTS },
      vehicles: { ...DEFAULT_VEHICLES },
      rates: { ...DEFAULT_RATES },
      charingCross: { ...CHARING_CROSS_REF },
    };
  }
  return global.__flamecars_fare_settings;
}

export function getDiscountCodes(): DiscountCode[] {
  if (!global.__flamecars_discount_codes) {
    global.__flamecars_discount_codes = new Map<string, DiscountCode>();
    for (const d of DEFAULT_DISCOUNTS) {
      global.__flamecars_discount_codes.set(d.code.toUpperCase(), { ...d });
    }
  }
  return Array.from(global.__flamecars_discount_codes.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getDiscountCode(rawCode: string): DiscountCode | undefined {
  if (!rawCode) return undefined;
  getDiscountCodes(); // ensure init
  return global.__flamecars_discount_codes?.get(rawCode.trim().toUpperCase());
}

export function getPricingAuditLogs(): PricingAuditLog[] {
  if (!global.__flamecars_pricing_audit_logs) {
    global.__flamecars_pricing_audit_logs = [
      {
        id: 'log_init',
        timestamp: new Date().toISOString(),
        changedBy: 'system@flamecars.co.uk',
        changeType: 'SYSTEM_RESET',
        summary: 'System initialized with default London airport base fares, vehicle multipliers, and promotion codes.',
      },
    ];
  }
  return [...global.__flamecars_pricing_audit_logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function addPricingAuditLog(entry: Omit<PricingAuditLog, 'id' | 'timestamp'>): PricingAuditLog {
  const list = getPricingAuditLogs();
  const log: PricingAuditLog = {
    id: 'log_' + Math.random().toString(36).substring(2, 10),
    timestamp: new Date().toISOString(),
    changedBy: entry.changedBy || 'staff@flamecars.co.uk',
    changeType: entry.changeType,
    summary: entry.summary,
    details: entry.details,
  };
  global.__flamecars_pricing_audit_logs = [log, ...list].slice(0, 200); // retain last 200 logs

  // Async persist to D1 if available
  getCloudflareD1().then(async (db) => {
    if (!db) return;
    try {
      await ensureD1SettingsTable(db);
      await db
        .prepare(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`)
        .bind('pricing_audit_logs', JSON.stringify(global.__flamecars_pricing_audit_logs), log.timestamp)
        .run();
    } catch {}
  }).catch(() => {});

  return log;
}

export function updateFareSettings(
  updates: Partial<SystemFareSettings>,
  changedBy: string = 'staff@flamecars.co.uk',
  auditSummary?: string
): SystemFareSettings {
  const current = getFareSettings();
  const changes: string[] = [];

  if (updates.airports) {
    current.airports = { ...current.airports, ...updates.airports };
    changes.push(`Updated ${Object.keys(updates.airports).length} airport fare(s) & terminal charges`);
  }
  if (updates.vehicles) {
    current.vehicles = { ...current.vehicles, ...updates.vehicles };
    changes.push(`Updated ${Object.keys(updates.vehicles).length} vehicle multiplier(s)`);
  }
  if (updates.rates) {
    current.rates = { ...current.rates, ...updates.rates };
    changes.push('Updated rates, target margin, or minimum acceptable margin');
  }

  global.__flamecars_fare_settings = current;

  // Record audit log
  if (changes.length > 0) {
    addPricingAuditLog({
      changedBy,
      changeType: updates.airports ? 'AIRPORT_FARE' : updates.vehicles ? 'VEHICLE_MULTIPLIER' : 'RATES_MARGIN',
      summary: auditSummary || changes.join('; '),
      details: updates,
    });
  }

  // Persist to D1
  getCloudflareD1().then(async (db) => {
    if (!db) return;
    try {
      await ensureD1SettingsTable(db);
      await db
        .prepare(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`)
        .bind('fare_settings', JSON.stringify(current), new Date().toISOString())
        .run();
    } catch (e) {
      console.warn('[D1] updateFareSettings error:', e);
    }
  }).catch(() => {});

  return current;
}

export function saveDiscountCode(discount: DiscountCode, changedBy: string = 'staff@flamecars.co.uk'): DiscountCode {
  getDiscountCodes(); // ensure init
  const cleanCode = discount.code.trim().toUpperCase();
  const existing = global.__flamecars_discount_codes?.get(cleanCode);
  const isNew = !existing;

  const now = new Date().toISOString();
  const item: DiscountCode = {
    ...discount,
    id: discount.id || 'disc_' + Math.random().toString(36).substring(2, 10),
    code: cleanCode,
    updatedAt: now,
    createdAt: discount.createdAt || now,
    createdBy: discount.createdBy || changedBy,
  };

  global.__flamecars_discount_codes?.set(cleanCode, item);

  addPricingAuditLog({
    changedBy,
    changeType: 'DISCOUNT_CODE',
    summary: isNew
      ? `Created promotion code '${cleanCode}' (${item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `£${item.discountValue}`} off)`
      : `Updated promotion code '${cleanCode}'`,
    details: item,
  });

  // Persist to D1
  getCloudflareD1().then(async (db) => {
    if (!db) return;
    try {
      await ensureD1SettingsTable(db);
      const all = Array.from(global.__flamecars_discount_codes?.values() || []);
      await db
        .prepare(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`)
        .bind('discount_codes', JSON.stringify(all), now)
        .run();
    } catch {}
  }).catch(() => {});

  return item;
}

export function deleteDiscountCode(idOrCode: string, changedBy: string = 'staff@flamecars.co.uk'): boolean {
  getDiscountCodes();
  if (!global.__flamecars_discount_codes) return false;

  let targetKey: string | null = null;
  let targetItem: DiscountCode | null = null;

  for (const [key, item] of global.__flamecars_discount_codes.entries()) {
    if (item.id === idOrCode || item.code.toUpperCase() === idOrCode.toUpperCase()) {
      targetKey = key;
      targetItem = item;
      break;
    }
  }

  if (!targetKey || !targetItem) return false;

  global.__flamecars_discount_codes.delete(targetKey);

  addPricingAuditLog({
    changedBy,
    changeType: 'DISCOUNT_CODE',
    summary: `Deleted promotion code '${targetItem.code}'`,
    details: targetItem,
  });

  // Persist to D1
  getCloudflareD1().then(async (db) => {
    if (!db) return;
    try {
      await ensureD1SettingsTable(db);
      const all = Array.from(global.__flamecars_discount_codes?.values() || []);
      await db
        .prepare(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`)
        .bind('discount_codes', JSON.stringify(all), new Date().toISOString())
        .run();
    } catch {}
  }).catch(() => {});

  return true;
}

export function recordDiscountUsage(code: string): void {
  const item = getDiscountCode(code);
  if (!item) return;
  item.usedCount = (item.usedCount || 0) + 1;
  item.updatedAt = new Date().toISOString();
  global.__flamecars_discount_codes?.set(item.code.toUpperCase(), item);

  getCloudflareD1().then(async (db) => {
    if (!db) return;
    try {
      await ensureD1SettingsTable(db);
      const all = Array.from(global.__flamecars_discount_codes?.values() || []);
      await db
        .prepare(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`)
        .bind('discount_codes', JSON.stringify(all), item.updatedAt)
        .run();
    } catch {}
  }).catch(() => {});
}

export interface DiscountValidationParams {
  code: string;
  fare: number;
  driverPayout: number;
  airportCharges: number;
  airportCode?: string;
  vehicleCategory?: string;
}

export interface DiscountValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  minMarginViolation?: boolean;
  discountCode?: DiscountCode;
  discountAmount: number;
  discountedFare: number;
  originalFare: number;
  netProfit: number;
  marginPercent: number;
  minAcceptableMarginPercent: number;
  targetMarginPercent: number;
  driverPayout: number;
  airportCharges: number;
  processingFee: number;
}

export function validateAndCalculateDiscount(
  params: DiscountValidationParams,
  customSettings?: SystemFareSettings
): DiscountValidationResult {
  const settings = customSettings || getFareSettings();
  const rates = settings.rates;
  const originalFare = Math.round(Number(params.fare) || 0);
  const driverPayout = Number(params.driverPayout) || 0;
  const airportCharges = Number(params.airportCharges) || 0;
  const minMargin = rates.minAcceptableMargin ?? 0.1;
  const targetMargin = rates.targetMargin ?? 0.2;

  const defaultFail = (msg: string): DiscountValidationResult => ({
    valid: false,
    error: msg,
    discountAmount: 0,
    discountedFare: originalFare,
    originalFare,
    netProfit: 0,
    marginPercent: 0,
    minAcceptableMarginPercent: Math.round(minMargin * 100),
    targetMarginPercent: Math.round(targetMargin * 100),
    driverPayout,
    airportCharges,
    processingFee: 0,
  });

  const rawCode = (params.code || '').trim().toUpperCase();
  if (!rawCode) {
    return defaultFail('Please enter a promotion code.');
  }

  const promo = getDiscountCode(rawCode);
  if (!promo) {
    return defaultFail(`Promotion code '${rawCode}' is invalid or does not exist.`);
  }

  if (!promo.isActive) {
    return defaultFail(`Promotion code '${rawCode}' is currently disabled.`);
  }

  if (promo.expiryDate) {
    const today = new Date().toISOString().split('T')[0];
    if (promo.expiryDate < today) {
      return defaultFail(`Promotion code '${rawCode}' expired on ${promo.expiryDate}.`);
    }
  }

  if (promo.usageLimit !== undefined && promo.usageLimit > 0) {
    if ((promo.usedCount || 0) >= promo.usageLimit) {
      return defaultFail(`Promotion code '${rawCode}' has reached its maximum usage limit.`);
    }
  }

  if (promo.minFare && originalFare < promo.minFare) {
    return defaultFail(`Promotion code '${rawCode}' requires a minimum fare of £${promo.minFare.toFixed(2)}.`);
  }

  if (promo.restrictedAirports && promo.restrictedAirports.length > 0) {
    const code = params.airportCode?.toUpperCase();
    if (!code || !promo.restrictedAirports.map((a) => a.toUpperCase()).includes(code)) {
      return defaultFail(
        `Promotion code '${rawCode}' is only valid for routes via: ${promo.restrictedAirports.join(', ')}.`
      );
    }
  }

  if (promo.restrictedVehicles && promo.restrictedVehicles.length > 0) {
    const vCat = (params.vehicleCategory || '').toLowerCase();
    const allowed = promo.restrictedVehicles.map((v) => v.toLowerCase());
    if (!vCat || !allowed.includes(vCat)) {
      return defaultFail(
        `Promotion code '${rawCode}' is only valid for vehicle categories: ${promo.restrictedVehicles.join(', ')}.`
      );
    }
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (promo.discountType === 'PERCENTAGE') {
    discountAmount = Math.round(originalFare * (promo.discountValue / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(originalFare, promo.discountValue);
  }

  // Never discount below £1
  const discountedFare = Math.max(1, Math.round((originalFare - discountAmount) * 100) / 100);

  // Contribution Margin Calculation:
  // Direct Costs = Driver Payout + Airport Charges + Payment Processing Fee (1.5% + £0.20)
  const processingFee = Math.round((discountedFare * rates.processingPercent + rates.processingFixed) * 100) / 100;
  const totalDirectCosts = driverPayout + airportCharges + processingFee;
  const netProfit = Math.round((discountedFare - totalDirectCosts) * 100) / 100;
  const marginPercent = discountedFare > 0 ? Math.round((netProfit / discountedFare) * 1000) / 10 : 0;

  // Margin Check: Does this discount bring the booking below the minimum acceptable margin?
  const marginRatio = discountedFare > 0 ? netProfit / discountedFare : 0;
  const isBelowMinMargin = marginRatio < minMargin;

  if (isBelowMinMargin) {
    return {
      valid: false,
      error: `Promotion '${promo.code}' cannot be applied because the resulting margin (${marginPercent}%) is below Flame Cars' minimum acceptable margin threshold (${Math.round(minMargin * 100)}%).`,
      warning: `Discount exceeds allowable margin threshold. Resulting profit is £${netProfit.toFixed(2)} (${marginPercent}% margin). Minimum required: ${Math.round(minMargin * 100)}%.`,
      minMarginViolation: true,
      discountCode: promo,
      discountAmount,
      discountedFare,
      originalFare,
      netProfit,
      marginPercent,
      minAcceptableMarginPercent: Math.round(minMargin * 100),
      targetMarginPercent: Math.round(targetMargin * 100),
      driverPayout,
      airportCharges,
      processingFee,
    };
  }

  let warning: string | undefined;
  if (marginRatio < targetMargin) {
    warning = `Notice: Resulting margin (${marginPercent}%) is below the target margin of ${Math.round(targetMargin * 100)}%, but meets the minimum acceptable threshold (${Math.round(minMargin * 100)}%).`;
  }

  return {
    valid: true,
    warning,
    minMarginViolation: false,
    discountCode: promo,
    discountAmount,
    discountedFare,
    originalFare,
    netProfit,
    marginPercent,
    minAcceptableMarginPercent: Math.round(minMargin * 100),
    targetMarginPercent: Math.round(targetMargin * 100),
    driverPayout,
    airportCharges,
    processingFee,
  };
}

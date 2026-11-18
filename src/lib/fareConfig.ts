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
  processingPercent: 0.015, // 1.5%
  processingFixed: 0.2, // £0.20
  nonAirportBasePayout: 15.0,
};

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

export function updateFareSettings(updates: Partial<SystemFareSettings>): SystemFareSettings {
  const current = getFareSettings();
  if (updates.airports) current.airports = { ...current.airports, ...updates.airports };
  if (updates.vehicles) current.vehicles = { ...current.vehicles, ...updates.vehicles };
  if (updates.rates) current.rates = { ...current.rates, ...updates.rates };
  global.__flamecars_fare_settings = current;
  return current;
}

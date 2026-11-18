import { BookingQuote, JourneyType, QuoteRequest, VehicleCategory, VehicleOption } from '@/types/booking';
import { getFareSettings, AirportFareConfig, DEFAULT_AIRPORTS, CHARING_CROSS_REF, LONDON_REFERENCE_HUBS, REFERENCE_HUBS } from '@/lib/fareConfig';
import { getEnv } from '@/lib/env';

export { APPROVED_AIRPORTS } from '@/lib/fareConfig';

// Greater London Postcode Area Prefixes for Geofencing
const GREATER_LONDON_POSTCODE_PREFIXES = [
  'E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC',
  'BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM', 'SM', 'TW', 'UB', 'WD',
];

/**
 * Detects if an address corresponds to one of the 6 London airports
 */
export function detectAirport(address: string): AirportFareConfig | null {
  const clean = address.toLowerCase().trim();
  const settings = getFareSettings();

  for (const ap of Object.values(settings.airports)) {
    if (ap.keywords.some((k) => clean.includes(k))) {
      return ap;
    }
  }

  return null;
}

/**
 * Check if an address refers to any airport
 */
export function isAirportAddress(address: string): boolean {
  return detectAirport(address) !== null;
}

/**
 * Validates whether the pickup location is within Greater London or one of the 6 approved airports.
 */
export function validatePickupEligibility(pickup: string): { isEligible: boolean; zoneName: string; isAirport: boolean } {
  const clean = pickup.toLowerCase().trim();

  // Check airports first
  const airport = detectAirport(pickup);
  if (airport) {
    return { isEligible: true, zoneName: airport.name, isAirport: true };
  }

  // Check known London reference hubs
  for (const hub of LONDON_REFERENCE_HUBS) {
    if (hub.keywords.some((k) => clean.includes(k))) {
      return { isEligible: true, zoneName: hub.name, isAirport: false };
    }
  }

  // Check London postcodes
  const postcodeMatch = clean.match(/\b([a-z]{1,2})\d{1,2}[a-z]?\s*\d[a-z]{2}\b/i);
  if (postcodeMatch) {
    const area = postcodeMatch[1].toUpperCase();
    if (GREATER_LONDON_POSTCODE_PREFIXES.includes(area)) {
      return { isEligible: true, zoneName: `Greater London (${area})`, isAirport: false };
    }
  }

  // Check general London keywords
  const londonKeywords = [
    'london', 'harrow', 'wembley', 'kensington', 'chelsea', 'fulham', 'camden',
    'islington', 'hackney', 'greenwich', 'wandsworth', 'croydon', 'barnet', 'ealing',
    'brent', 'hounslow', 'uxbridge', 'kingston', 'stratford', 'canary wharf', 'barking',
    'enfield', 'bromley', 'bexley', 'havering', 'richmond', 'twickenham'
  ];
  if (londonKeywords.some((k) => clean.includes(k))) {
    return { isEligible: true, zoneName: 'Greater London', isAirport: false };
  }

  return { isEligible: false, zoneName: 'Outside Greater London / Approved Airports', isAirport: false };
}

/**
 * Approximate geographical coordinates for an address or UK location
 */
function resolveApproxCoordinates(address: string): { lat: number; lng: number } {
  const clean = address.toLowerCase();

  // Check airports
  const ap = detectAirport(address);
  if (ap) {
    return { lat: ap.lat, lng: ap.lng };
  }

  // Check reference hubs
  for (const hub of REFERENCE_HUBS) {
    if (hub.keywords.some((k) => clean.includes(k))) {
      return { lat: hub.lat, lng: hub.lng };
    }
  }

  // Check specific London zones by postcode
  if (/\b(ha\d|wembley|harrow)/i.test(clean)) return { lat: 51.5806, lng: -0.3418 };
  if (/\b(tw\d|richmond|twickenham|kingston)/i.test(clean)) return { lat: 51.4613, lng: -0.3037 };
  if (/\b(e14|canary|docklands)/i.test(clean)) return { lat: 51.5054, lng: -0.0235 };
  if (/\b(cr\d|croydon)/i.test(clean)) return { lat: 51.3762, lng: -0.0982 };
  if (/\b(n\d|islington|camden)/i.test(clean)) return { lat: 51.5465, lng: -0.1058 };
  if (/\b(sw1|westminster|victoria)/i.test(clean)) return { lat: 51.4995, lng: -0.1333 };
  if (/\b(w1|mayfair|soho|marylebone)/i.test(clean)) return { lat: 51.5136, lng: -0.1486 };
  if (/\b(ec1|ec2|city of london)/i.test(clean)) return { lat: 51.5155, lng: -0.0922 };

  // Default to Central London
  return { lat: 51.5074, lng: -0.1278 };
}

/**
 * Estimate road distance and duration using Haversine with road winding factor & traffic time model
 */
export function estimateRoadDistanceAndDuration(
  pickup: string,
  destination: string,
  travelDateTime?: Date
): { miles: number; minutes: number } {
  const p = resolveApproxCoordinates(pickup);
  const d = resolveApproxCoordinates(destination);

  const pClean = pickup.toLowerCase();
  const dClean = destination.toLowerCase();

  // Direct known airport corridors to Central London / Charing Cross
  const isCharingCrossOrCentral = (str: string) =>
    str.includes('charing cross') || str.includes('central london') || str.includes('westminster') || str.includes('london');

  if (pClean.includes('heathrow') && isCharingCrossOrCentral(dClean)) return { miles: 16.5, minutes: 50 };
  if (isCharingCrossOrCentral(pClean) && dClean.includes('heathrow')) return { miles: 16.5, minutes: 50 };

  if (pClean.includes('gatwick') && isCharingCrossOrCentral(dClean)) return { miles: 29.5, minutes: 75 };
  if (isCharingCrossOrCentral(pClean) && dClean.includes('gatwick')) return { miles: 29.5, minutes: 75 };

  if (pClean.includes('stansted') && isCharingCrossOrCentral(dClean)) return { miles: 38.0, minutes: 70 };
  if (isCharingCrossOrCentral(pClean) && dClean.includes('stansted')) return { miles: 38.0, minutes: 70 };

  if (pClean.includes('luton') && isCharingCrossOrCentral(dClean)) return { miles: 34.5, minutes: 65 };
  if (isCharingCrossOrCentral(pClean) && dClean.includes('luton')) return { miles: 34.5, minutes: 65 };

  if (pClean.includes('city') && isCharingCrossOrCentral(dClean)) return { miles: 9.5, minutes: 35 };
  if (isCharingCrossOrCentral(pClean) && dClean.includes('city')) return { miles: 9.5, minutes: 35 };

  if (pClean.includes('southend') && isCharingCrossOrCentral(dClean)) return { miles: 42.0, minutes: 75 };
  if (isCharingCrossOrCentral(pClean) && dClean.includes('southend')) return { miles: 42.0, minutes: 75 };

  // Haversine calculation with 1.28 road winding factor
  const R = 3958.8; // Earth radius in miles
  const dLat = ((d.lat - p.lat) * Math.PI) / 180;
  const dLng = ((d.lng - p.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p.lat * Math.PI) / 180) *
      Math.cos((d.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightMiles = R * c;

  const roadMiles = Math.max(1.5, Math.round(straightMiles * 1.28 * 10) / 10);

  // Time calculation based on road type and traffic
  let avgMph = 24;
  if (roadMiles < 5) avgMph = 14;
  else if (roadMiles < 15) avgMph = 20;
  else if (roadMiles < 30) avgMph = 28;
  else if (roadMiles < 60) avgMph = 38;
  else avgMph = 50;

  // Traffic multiplier based on departure time
  let trafficMultiplier = 1.0;
  if (travelDateTime) {
    const hour = travelDateTime.getHours() + travelDateTime.getMinutes() / 60;
    const isWeekend = travelDateTime.getDay() === 0 || travelDateTime.getDay() === 6;

    if (!isWeekend) {
      if (hour >= 7.0 && hour <= 9.5) {
        // Morning rush hour
        trafficMultiplier = 1.35;
      } else if (hour >= 16.5 && hour <= 19.0) {
        // Evening rush hour
        trafficMultiplier = 1.35;
      } else if (hour >= 22.0 || hour < 6.0) {
        // Late night
        trafficMultiplier = 0.85;
      }
    }
  }

  const baseMinutes = (roadMiles / avgMph) * 60;
  const minutes = Math.max(8, Math.round(baseMinutes * trafficMultiplier));

  return { miles: roadMiles, minutes };
}

/**
 * Fetch route distance & duration using Google Maps Distance Matrix API if configured,
 * or fall back to traffic-aware routing estimator.
 */
export async function getRouteDistanceAndDuration(
  origin: string,
  destination: string,
  departureDateTime?: Date
): Promise<{ miles: number; minutes: number; isGoogleRoute: boolean }> {
  const googleKey = getEnv('GOOGLE_MAPS_API_KEY') || getEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');

  if (googleKey && !googleKey.startsWith('your_') && googleKey.length > 15) {
    try {
      const departureTimeParam = departureDateTime
        ? Math.floor(Math.max(Date.now(), departureDateTime.getTime()) / 1000)
        : Math.floor(Date.now() / 1000);

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        origin
      )}&destinations=${encodeURIComponent(
        destination
      )}&departure_time=${departureTimeParam}&traffic_model=best_guess&units=imperial&key=${googleKey}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const element = data?.rows?.[0]?.elements?.[0];

        if (element && element.status === 'OK') {
          const meters = element.distance.value;
          const seconds = element.duration_in_traffic ? element.duration_in_traffic.value : element.duration.value;

          const miles = Math.round((meters / 1609.344) * 10) / 10;
          const minutes = Math.round(seconds / 60);

          return { miles, minutes, isGoogleRoute: true };
        }
      }
    } catch (err) {
      console.warn('[ROUTING] Google Distance Matrix request failed, using traffic-aware model:', err);
    }
  }

  const estimated = estimateRoadDistanceAndDuration(origin, destination, departureDateTime);
  return { ...estimated, isGoogleRoute: false };
}

/**
 * Generate a verified server-side Quote following the Flame Cars Fare Calculation specification
 */
export async function generateBookingQuoteAsync(req: QuoteRequest): Promise<BookingQuote> {
  const settings = getFareSettings();
  const rates = settings.rates;

  // 1. Check pickup geofence eligibility
  const originCheck = validatePickupEligibility(req.pickupAddress);

  // 2. Parse pickup date & time for traffic estimation
  let travelDateTime: Date | undefined;
  try {
    travelDateTime = new Date(`${req.pickupDate}T${req.pickupTime}:00`);
    if (isNaN(travelDateTime.getTime())) travelDateTime = new Date();
  } catch {
    travelDateTime = new Date();
  }

  // 3. Classify Journey Type & Detect Airport
  const pickupAirport = detectAirport(req.pickupAddress);
  const dropoffAirport = detectAirport(req.destinationAddress);

  let journeyType: JourneyType = 'POINT_TO_POINT';
  let activeAirport: AirportFareConfig | null = null;

  if (pickupAirport) {
    journeyType = 'AIRPORT_PICKUP';
    activeAirport = pickupAirport;
  } else if (dropoffAirport) {
    journeyType = 'AIRPORT_DROPOFF';
    activeAirport = dropoffAirport;
  }

  // 4. Calculate Actual Journey Distance & Time
  const actualRoute = await getRouteDistanceAndDuration(req.pickupAddress, req.destinationAddress, travelDateTime);
  const actualMiles = actualRoute.miles;
  const actualMins = actualRoute.minutes;

  // 5. Calculate Airport Charges
  // - Pickups: £5 collection allowance + parking budget
  // - Drop-offs: Terminal drop-off charge only
  // - Point-to-point: £0
  let airportCharges = 0.0;
  if (journeyType === 'AIRPORT_PICKUP' && activeAirport) {
    airportCharges = activeAirport.collectionAllowance + activeAirport.pickupParking;
  } else if (journeyType === 'AIRPORT_DROPOFF' && activeAirport) {
    airportCharges = activeAirport.dropoffCharge;
  }

  // 6. Calculate Reference Journey & Traffic Surcharge (if airport journey)
  let refMiles = 0;
  let refMins = 0;
  let refTrafficThreshold = 0;
  let refTrafficSurcharge = 0;
  let economyDriverPayout = 0;

  if (activeAirport) {
    // Reference direction matches actual journey:
    // If Pickup: Airport -> Charing Cross
    // If Dropoff: Charing Cross -> Airport
    const refOrigin = journeyType === 'AIRPORT_PICKUP' ? activeAirport.name : settings.charingCross.name;
    const refDest = journeyType === 'AIRPORT_PICKUP' ? settings.charingCross.name : activeAirport.name;

    const refRoute = await getRouteDistanceAndDuration(refOrigin, refDest, travelDateTime);
    refMiles = refRoute.miles;
    refMins = refRoute.minutes;
    refTrafficThreshold = activeAirport.trafficThresholdMinutes;

    // Traffic surcharge if predicted reference duration exceeds airport threshold:
    // Reference traffic surcharge = £0.17 x minutes above threshold
    if (refMins > refTrafficThreshold) {
      refTrafficSurcharge = Math.round((refMins - refTrafficThreshold) * rates.trafficRate * 100) / 100;
    }

    // Mileage & Time Differences
    const mileageDiff = actualMiles - refMiles;
    const timeDiff = actualMins - refMins;

    // Economy driver payout:
    // MAX(£20, Airport base fare + reference traffic surcharge + mileage diff x £1.25 + time diff x £0.17)
    const rawEconomyPayout =
      activeAirport.baseDriverFare +
      refTrafficSurcharge +
      mileageDiff * rates.mileageRate +
      timeDiff * rates.minuteRate;

    economyDriverPayout = Math.max(rates.minEconomyDriverPayout, Math.round(rawEconomyPayout * 100) / 100);
  } else {
    // Point-to-Point (Non-Airport) Journey
    // Minimum £20.00, calculated with £1.25/mile and £0.17/minute from base
    const rawNonAirportPayout =
      rates.nonAirportBasePayout + actualMiles * rates.mileageRate + actualMins * rates.minuteRate;
    economyDriverPayout = Math.max(rates.minEconomyDriverPayout, Math.round(rawNonAirportPayout * 100) / 100);
  }

  // 7. Calculate Vehicle Fares & Customer Pricing
  // Flame Cars target: 20% contribution margin after driver payout, airport charges and payment-processing fees.
  // Customer Fare = ROUND UP [(Driver Payout + Airport Charges + Other Direct Costs + £0.20) / 0.785]
  const divisor = 1.0 - rates.targetMargin - rates.processingPercent; // 0.785

  const vehicles: VehicleOption[] = Object.values(settings.vehicles).map((v) => {
    // Only journey payout is multiplied by vehicle multiplier; airport charges are added separately
    const vehicleDriverPayout = Math.round(economyDriverPayout * v.multiplier * 100) / 100;

    // Total direct costs before margin
    const totalCosts = vehicleDriverPayout + airportCharges + rates.processingFixed;

    // Customer fare rounded up to the next whole pound
    const finalCustomerFare = Math.ceil(totalCosts / divisor);

    return {
      id: v.id as VehicleCategory,
      category: v.category as VehicleCategory,
      name: v.name,
      tagline: `${v.maxPassengers} Passengers · ${v.maxLuggage} Large Bags`,
      exampleModels: v.exampleModels,
      maxPassengers: v.maxPassengers,
      maxLuggage: v.maxLuggage,
      multiplier: v.multiplier,
      driverPayout: vehicleDriverPayout,
      baseFare: v.multiplier * (activeAirport ? activeAirport.baseDriverFare : rates.nonAirportBasePayout),
      perMileRate: rates.mileageRate,
      minFare: rates.minEconomyDriverPayout,
      totalFare: finalCustomerFare,
      tbmsCarTypeId: v.tbmsCarTypeId,
      inclusions: v.inclusions,
    };
  });

  const quoteId = 'qt_' + Math.random().toString(36).substring(2, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const pickupIso = `${req.pickupDate}T${req.pickupTime}:00`;

  return {
    quoteId,
    pickupAddress: req.pickupAddress.trim(),
    destinationAddress: req.destinationAddress.trim(),
    pickupDate: req.pickupDate,
    pickupTime: req.pickupTime,
    pickupDateTimeIso: pickupIso,
    passengers: Number(req.passengers) || 1,
    luggage: Number(req.luggage) || 0,
    distanceMiles: actualMiles,
    durationMinutes: actualMins,
    journeyType,
    airportCode: activeAirport?.code,
    airportName: activeAirport?.name,
    airportCharges,
    isOriginEligible: originCheck.isEligible,
    originZoneName: originCheck.zoneName,
    isAirportPickup: journeyType === 'AIRPORT_PICKUP',
    airportFee: airportCharges,
    driverPayoutEconomy: economyDriverPayout,
    referenceJourney: activeAirport
      ? {
          distanceMiles: refMiles,
          durationMinutes: refMins,
          trafficThresholdMinutes: refTrafficThreshold,
          trafficSurcharge: refTrafficSurcharge,
        }
      : undefined,
    vehicles,
    expiresAt,
    createdAt: now.toISOString(),
  };
}

/**
 * Synchronous quote wrapper for existing backwards compatibility
 */
export function generateBookingQuote(req: QuoteRequest): BookingQuote {
  const settings = getFareSettings();
  const rates = settings.rates;

  const originCheck = validatePickupEligibility(req.pickupAddress);

  let travelDateTime: Date | undefined;
  try {
    travelDateTime = new Date(`${req.pickupDate}T${req.pickupTime}:00`);
    if (isNaN(travelDateTime.getTime())) travelDateTime = new Date();
  } catch {
    travelDateTime = new Date();
  }

  const pickupAirport = detectAirport(req.pickupAddress);
  const dropoffAirport = detectAirport(req.destinationAddress);

  let journeyType: JourneyType = 'POINT_TO_POINT';
  let activeAirport: AirportFareConfig | null = null;

  if (pickupAirport) {
    journeyType = 'AIRPORT_PICKUP';
    activeAirport = pickupAirport;
  } else if (dropoffAirport) {
    journeyType = 'AIRPORT_DROPOFF';
    activeAirport = dropoffAirport;
  }

  const actualRoute = estimateRoadDistanceAndDuration(req.pickupAddress, req.destinationAddress, travelDateTime);
  const actualMiles = actualRoute.miles;
  const actualMins = actualRoute.minutes;

  let airportCharges = 0.0;
  if (journeyType === 'AIRPORT_PICKUP' && activeAirport) {
    airportCharges = activeAirport.collectionAllowance + activeAirport.pickupParking;
  } else if (journeyType === 'AIRPORT_DROPOFF' && activeAirport) {
    airportCharges = activeAirport.dropoffCharge;
  }

  let refMiles = 0;
  let refMins = 0;
  let refTrafficThreshold = 0;
  let refTrafficSurcharge = 0;
  let economyDriverPayout = 0;

  if (activeAirport) {
    const refOrigin = journeyType === 'AIRPORT_PICKUP' ? activeAirport.name : settings.charingCross.name;
    const refDest = journeyType === 'AIRPORT_PICKUP' ? settings.charingCross.name : activeAirport.name;

    const refRoute = estimateRoadDistanceAndDuration(refOrigin, refDest, travelDateTime);
    refMiles = refRoute.miles;
    refMins = refRoute.minutes;
    refTrafficThreshold = activeAirport.trafficThresholdMinutes;

    if (refMins > refTrafficThreshold) {
      refTrafficSurcharge = Math.round((refMins - refTrafficThreshold) * rates.trafficRate * 100) / 100;
    }

    const mileageDiff = actualMiles - refMiles;
    const timeDiff = actualMins - refMins;

    const rawEconomyPayout =
      activeAirport.baseDriverFare +
      refTrafficSurcharge +
      mileageDiff * rates.mileageRate +
      timeDiff * rates.minuteRate;

    economyDriverPayout = Math.max(rates.minEconomyDriverPayout, Math.round(rawEconomyPayout * 100) / 100);
  } else {
    const rawNonAirportPayout =
      rates.nonAirportBasePayout + actualMiles * rates.mileageRate + actualMins * rates.minuteRate;
    economyDriverPayout = Math.max(rates.minEconomyDriverPayout, Math.round(rawNonAirportPayout * 100) / 100);
  }

  const divisor = 1.0 - rates.targetMargin - rates.processingPercent; // 0.785

  const vehicles: VehicleOption[] = Object.values(settings.vehicles).map((v) => {
    const vehicleDriverPayout = Math.round(economyDriverPayout * v.multiplier * 100) / 100;
    const totalCosts = vehicleDriverPayout + airportCharges + rates.processingFixed;
    const finalCustomerFare = Math.ceil(totalCosts / divisor);

    return {
      id: v.id as VehicleCategory,
      category: v.category as VehicleCategory,
      name: v.name,
      tagline: `${v.maxPassengers} Passengers · ${v.maxLuggage} Large Bags`,
      exampleModels: v.exampleModels,
      maxPassengers: v.maxPassengers,
      maxLuggage: v.maxLuggage,
      multiplier: v.multiplier,
      driverPayout: vehicleDriverPayout,
      baseFare: v.multiplier * (activeAirport ? activeAirport.baseDriverFare : rates.nonAirportBasePayout),
      perMileRate: rates.mileageRate,
      minFare: rates.minEconomyDriverPayout,
      totalFare: finalCustomerFare,
      tbmsCarTypeId: v.tbmsCarTypeId,
      inclusions: v.inclusions,
    };
  });

  const quoteId = 'qt_' + Math.random().toString(36).substring(2, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const pickupIso = `${req.pickupDate}T${req.pickupTime}:00`;

  return {
    quoteId,
    pickupAddress: req.pickupAddress.trim(),
    destinationAddress: req.destinationAddress.trim(),
    pickupDate: req.pickupDate,
    pickupTime: req.pickupTime,
    pickupDateTimeIso: pickupIso,
    passengers: Number(req.passengers) || 1,
    luggage: Number(req.luggage) || 0,
    distanceMiles: actualMiles,
    durationMinutes: actualMins,
    journeyType,
    airportCode: activeAirport?.code,
    airportName: activeAirport?.name,
    airportCharges,
    isOriginEligible: originCheck.isEligible,
    originZoneName: originCheck.zoneName,
    isAirportPickup: journeyType === 'AIRPORT_PICKUP',
    airportFee: airportCharges,
    driverPayoutEconomy: economyDriverPayout,
    referenceJourney: activeAirport
      ? {
          distanceMiles: refMiles,
          durationMinutes: refMins,
          trafficThresholdMinutes: refTrafficThreshold,
          trafficSurcharge: refTrafficSurcharge,
        }
      : undefined,
    vehicles,
    expiresAt,
    createdAt: now.toISOString(),
  };
}

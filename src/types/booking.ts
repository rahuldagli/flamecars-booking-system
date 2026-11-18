export type VehicleCategory =
  | 'Economy'
  | 'Estate'
  | 'MPV'
  | 'Executive'
  | 'Executive Saloon'
  | 'Executive MPV'
  | 'economy'
  | 'estate'
  | 'mpv'
  | 'executive'
  | 'executive_mpv';

export type JourneyType = 'AIRPORT_PICKUP' | 'AIRPORT_DROPOFF' | 'POINT_TO_POINT';

export type BookingStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'PAYMENT_PENDING'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'CONFIRMED'
  | 'FAILED_REVIEW'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'UNPAID';

export type TbmsBookingStatus = 'NOT_SUBMITTED' | 'NOT_ATTEMPTED' | 'PENDING' | 'SYNCED' | 'FAILED';

export interface VehicleOption {
  id: VehicleCategory;
  category: VehicleCategory;
  name: string;
  tagline: string;
  exampleModels: string;
  maxPassengers: number;
  maxLuggage: number;
  multiplier: number;
  driverPayout: number;
  baseFare: number;
  perMileRate: number;
  minFare: number;
  totalFare: number;
  tbmsCarTypeId: string;
  inclusions: string[];
}

export interface QuoteRequest {
  pickupAddress: string;
  destinationAddress: string;
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:mm
  passengers: number;
  luggage: number;
}

export interface BookingQuote {
  quoteId: string;
  pickupAddress: string;
  destinationAddress: string;
  pickupDate: string;
  pickupTime: string;
  pickupDateTimeIso: string;
  passengers: number;
  luggage: number;
  distanceMiles: number;
  durationMinutes: number;
  journeyType: JourneyType;
  airportCode?: string;
  airportName?: string;
  airportCharges: number;
  isOriginEligible: boolean;
  originZoneName?: string;
  isAirportPickup: boolean;
  airportFee: number;
  driverPayoutEconomy: number;
  referenceJourney?: {
    distanceMiles: number;
    durationMinutes: number;
    trafficThresholdMinutes: number;
    trafficSurcharge: number;
  };
  requiresManualQuote?: boolean;
  manualQuoteReason?: string;
  vehicles: VehicleOption[];
  expiresAt: string;
  createdAt: string;
}

export interface CustomerBooking {
  id: string;
  referenceNumber: string; // FLM-BK-2026-XXXXXX
  quoteId?: string;
  status?: BookingStatus;
  bookingStatus?: BookingStatus;

  // Journey details
  pickupAddress: string;
  destinationAddress: string;
  pickupDate: string;
  pickupTime: string;
  pickupDateTimeIso: string;
  passengers: number;
  luggage: number;
  distanceMiles: number;
  durationMinutes?: number;
  journeyType?: JourneyType;
  isAirportPickup?: boolean;
  airportFee?: number;
  airportCharges?: number;

  // Vehicle & Pricing
  vehicleCategory: VehicleCategory;
  vehicleName: string;
  fare: number;
  driverPayout?: number;
  currency?: 'GBP' | string;
  fareBreakdown?: {
    driverPayout: number;
    airportCharges: number;
    processingFee: number;
    profitMargin: number;
    totalFare: number;
    baseFare?: number;
    mileageFare?: number;
    airportFee?: number;
  };

  // Customer contact details
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  flightNumber?: string;
  notes?: string;

  // Agreement
  termsAccepted?: boolean;
  termsAcceptedAt?: string;

  // Payment
  paymentMethod?: 'STRIPE' | string;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: string;

  // TBMS Dispatch
  tbmsStatus: TbmsBookingStatus;
  tbmsJobReference?: string;
  tbmsCarTypeId?: string;
  tbmsSyncedAt?: string;
  tbmsError?: string;

  // Notifications
  customerEmailSent?: boolean;
  adminEmailSent?: boolean;

  createdAt: string;
  updatedAt: string;
}

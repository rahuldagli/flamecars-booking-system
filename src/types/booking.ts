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

export type { AirportFareConfig, VehicleCategoryConfig, RatesConfig, SystemFareSettings } from '@/lib/fareConfig';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface DiscountCode {
  id: string;
  code: string; // e.g. "WELCOME10", uppercase
  description?: string;
  discountType: DiscountType; // 'PERCENTAGE' or 'FIXED'
  discountValue: number; // e.g. 10 (%) or 5 (£)
  expiryDate?: string; // YYYY-MM-DD or ISO string, optional
  usageLimit?: number; // max number of uses (optional)
  usedCount: number; // current usage count
  minFare?: number; // minimum booking fare in GBP required to apply
  restrictedAirports?: string[]; // e.g. ['LHR', 'LGW'] or empty for all
  restrictedVehicles?: string[]; // e.g. ['economy', 'executive'] or empty for all
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PricingAuditLog {
  id: string;
  timestamp: string; // ISO string
  changedBy: string; // staff email / name
  changeType: 'AIRPORT_FARE' | 'VEHICLE_MULTIPLIER' | 'RATES_MARGIN' | 'DISCOUNT_CODE' | 'SYSTEM_RESET';
  summary: string;
  details?: Record<string, any>;
}

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
  discountCode?: string;
  discountAmount?: number;
  originalFare?: number;
  netMarginPercent?: number;
  fareBreakdown?: {
    driverPayout: number;
    airportCharges: number;
    processingFee: number;
    profitMargin: number;
    totalFare: number;
    originalFare?: number;
    discountAmount?: number;
    netProfit?: number;
    marginPercent?: number;
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
  customerEmailMessageId?: string;
  adminEmailSent?: boolean;
  staffEmailSent?: boolean;

  createdAt: string;
  updatedAt: string;
}

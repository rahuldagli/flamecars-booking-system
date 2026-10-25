export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'APPROVED_PENDING_TBMS'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

export type DocumentType =
  | 'TFL_PHV_DRIVER_BADGE_FRONT'
  | 'TFL_PHV_DRIVER_BADGE_BACK'
  | 'DVLA_DRIVING_LICENCE_FRONT'
  | 'DVLA_DRIVING_LICENCE_BACK'
  | 'TFL_PHV_VEHICLE_LICENCE'
  | 'HIRE_REWARD_INSURANCE'
  | 'MOT_CERTIFICATE'
  | 'V5C_LOGBOOK';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UploadedDoc {
  id: string;
  type: DocumentType;
  title: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  dataUrl?: string; // Base64 preview for client/demo
  expiryDate?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  uploadedAt: string;
  isAnalyzing?: boolean;
  aiExtractedData?: {
    confidence?: number;
    fullName?: string;
    licenceNumber?: string;
    expiryDate?: string;
    vrm?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    policyNumber?: string;
    summary?: string;
    [key: string]: string | number | undefined;
  };
}

export interface DriverApplication {
  id: string;
  referenceNumber: string; // FLM-DRV-2026-XXXX
  status: ApplicationStatus;
  currentStep: number;
  updatedAt: string;

  // Step 1: Personal & TfL Badge
  legalName: string;
  mobileNumber: string;
  isMobileVerified: boolean;
  email: string;
  residentialAddress: string;
  postcode: string;
  tflDriverBadgeNum: string;
  tflDriverBadgeExpiry: string;
  profilePhotoUrl?: string;

  // Step 2: Vehicle
  vrm: string;
  make: string;
  model: string;
  colour: string;
  year?: string;
  passengerSeats: number;
  tflPhvVehicleLicence: string;
  tflPhvVehicleExpiry: string;
  vehicleCategory: string; // Saloon, Estate, MPV, Executive

  // Step 3: Documents
  documents: Record<DocumentType, UploadedDoc | null>;

  // Step 4: Preferences & Agreement
  preferredAirports: string[];
  operatingZones: string[];
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  signatureDataUrl?: string;

  // Step 5: Submission
  consentAccuracy: boolean;
  submittedAt?: string;

  // Compliance / TBMS
  tflRegisterVerified: boolean;
  tflRegisterNotes?: string;
  tbmsSyncStatus?: 'NOT_SYNCED' | 'PENDING' | 'SYNCED' | 'FAILED';
  tbmsDriverId?: string;
  tbmsSyncError?: string;
}

export const INITIAL_APPLICATION: DriverApplication = {
  id: '',
  referenceNumber: '',
  status: 'DRAFT',
  currentStep: 0,
  updatedAt: new Date().toISOString(),

  legalName: '',
  mobileNumber: '',
  isMobileVerified: false,
  email: '',
  residentialAddress: '',
  postcode: '',
  tflDriverBadgeNum: '',
  tflDriverBadgeExpiry: '',
  profilePhotoUrl: '',

  vrm: '',
  make: '',
  model: '',
  colour: '',
  year: '',
  passengerSeats: 4,
  tflPhvVehicleLicence: '',
  tflPhvVehicleExpiry: '',
  vehicleCategory: 'Saloon',

  documents: {
    TFL_PHV_DRIVER_BADGE_FRONT: null,
    TFL_PHV_DRIVER_BADGE_BACK: null,
    DVLA_DRIVING_LICENCE_FRONT: null,
    DVLA_DRIVING_LICENCE_BACK: null,
    TFL_PHV_VEHICLE_LICENCE: null,
    HIRE_REWARD_INSURANCE: null,
    MOT_CERTIFICATE: null,
    V5C_LOGBOOK: null,
  },

  preferredAirports: ['Heathrow (LHR)'],
  operatingZones: ['Greater London', 'West London / Harrow'],
  termsAccepted: false,
  consentAccuracy: false,
  tflRegisterVerified: false,
  tbmsSyncStatus: 'NOT_SYNCED',
};

export const REQUIRED_DOCUMENTS_CONFIG: {
  type: DocumentType;
  title: string;
  category: 'driver' | 'vehicle';
  description: string;
  requiresExpiry: boolean;
  isMandatory: boolean;
}[] = [
  {
    type: 'TFL_PHV_DRIVER_BADGE_FRONT',
    title: 'TfL PHV Driver Badge (Front)',
    category: 'driver',
    description: 'Clear color photo showing your photo, full name, and badge number.',
    requiresExpiry: true,
    isMandatory: true,
  },
  {
    type: 'TFL_PHV_DRIVER_BADGE_BACK',
    title: 'TfL PHV Driver Badge (Back)',
    category: 'driver',
    description: 'Reverse side showing barcode, security hologram, and conditions.',
    requiresExpiry: false,
    isMandatory: true,
  },
  {
    type: 'DVLA_DRIVING_LICENCE_FRONT',
    title: 'DVLA Driving Licence (Photocard Front)',
    category: 'driver',
    description: 'Great Britain driving licence photocard front showing Category B.',
    requiresExpiry: true,
    isMandatory: true,
  },
  {
    type: 'DVLA_DRIVING_LICENCE_BACK',
    title: 'DVLA Driving Licence (Photocard Back)',
    category: 'driver',
    description: 'Reverse side showing vehicle entitlement categories and valid dates.',
    requiresExpiry: false,
    isMandatory: true,
  },
  {
    type: 'TFL_PHV_VEHICLE_LICENCE',
    title: 'TfL PHV Vehicle Licence Disc / Letter',
    category: 'vehicle',
    description: 'Valid vehicle licence document showing vehicle VRM and passenger capacity.',
    requiresExpiry: true,
    isMandatory: true,
  },
  {
    type: 'HIRE_REWARD_INSURANCE',
    title: 'Hire & Reward Insurance Certificate',
    category: 'vehicle',
    description: 'Valid Private Hire / Hire & Reward insurance certificate or schedule covering the vehicle.',
    requiresExpiry: true,
    isMandatory: true,
  },
  {
    type: 'MOT_CERTIFICATE',
    title: 'MOT Certificate',
    category: 'vehicle',
    description: 'Current valid MOT certificate (mandatory for vehicles over 1 year old).',
    requiresExpiry: true,
    isMandatory: true,
  },
  {
    type: 'V5C_LOGBOOK',
    title: 'V5C Logbook / Permission Letter',
    category: 'vehicle',
    description: 'V5C registration certificate (Page 2) or formal vehicle hire/permission agreement.',
    requiresExpiry: false,
    isMandatory: false,
  },
];

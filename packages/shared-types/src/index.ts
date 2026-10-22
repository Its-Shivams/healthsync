// ==========================================
// HealthSync Shared Domain Types & Enums
// ==========================================

export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  LAB_ADMIN = 'LAB_ADMIN',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export enum RecordCategory {
  PRESCRIPTION = 'PRESCRIPTION',
  LAB_REPORT = 'LAB_REPORT',
  IMAGING = 'IMAGING',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  CONSULTATION_NOTE = 'CONSULTATION_NOTE',
  VACCINATION = 'VACCINATION',
  ALLERGY_RECORD = 'ALLERGY_RECORD',
  INSURANCE_DOCUMENT = 'INSURANCE_DOCUMENT',
  OTHER = 'OTHER',
}

export enum ConsentStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum AccessPurpose {
  DIRECT_CARE = 'DIRECT_CARE',
  EMERGENCY_CARE = 'EMERGENCY_CARE',
  SECOND_OPINION = 'SECOND_OPINION',
  DIAGNOSTIC_EVALUATION = 'DIAGNOSTIC_EVALUATION',
  SPECIALIST_REFERRAL = 'SPECIALIST_REFERRAL',
  FOLLOW_UP = 'FOLLOW_UP',
}

export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum FacilityType {
  GENERAL_HOSPITAL = 'GENERAL_HOSPITAL',
  SPECIALITY_CLINIC = 'SPECIALITY_CLINIC',
  DIAGNOSTIC_CENTER = 'DIAGNOSTIC_CENTER',
  PRIMARY_HEALTH_CENTER = 'PRIMARY_HEALTH_CENTER',
  TRAUMA_CARE = 'TRAUMA_CARE',
}

export enum TriageUrgency {
  ROUTINE_CARE = 'ROUTINE_CARE',
  MEDICAL_EVALUATION = 'MEDICAL_EVALUATION',
  POSSIBLE_EMERGENCY = 'POSSIBLE_EMERGENCY',
}

export enum OCRStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum AuditActionType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  RECORD_VIEW = 'RECORD_VIEW',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_DOWNLOAD = 'DOCUMENT_DOWNLOAD',
  DOCUMENT_VERIFY = 'DOCUMENT_VERIFY',
  CONSENT_GRANT = 'CONSENT_GRANT',
  CONSENT_REVOKE = 'CONSENT_REVOKE',
  CONSENT_DENIED = 'CONSENT_DENIED',
  BREAK_GLASS_ACCESS = 'BREAK_GLASS_ACCESS',
  PRESCRIPTION_CREATE = 'PRESCRIPTION_CREATE',
  ENCOUNTER_CREATE = 'ENCOUNTER_CREATE',
  APPOINTMENT_BOOK = 'APPOINTMENT_BOOK',
  AI_CHAT_QUERY = 'AI_CHAT_QUERY',
}

// User & Profiles
export interface UserDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  isMfaEnabled: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientProfileDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  heightCm?: number;
  weightKg?: number;
  knownAllergies?: string[];
  chronicConditions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfileDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  licenseNumber: string;
  specialties: string[];
  qualifications: string[];
  experienceYears: number;
  bio?: string;
  consultationFee: number;
  organizationId?: string;
  organizationName?: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HealthcareFacilityDTO {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
  contactEmail: string;
  operatingHours: string;
  specialties: string[];
  availableServices: string[];
  hasEmergencyUnit: boolean;
  isVerified: boolean;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

// Medical Documents & Records
export interface MedicalDocumentDTO {
  id: string;
  patientId: string;
  patientName?: string;
  uploadedByUserId: string;
  uploadedByName?: string;
  title: string;
  description?: string;
  category: RecordCategory;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  sha256Hash: string;
  downloadUrl?: string;
  ocrStatus: OCRStatus;
  extractedText?: string;
  extractedDraft?: ExtractedClinicalData;
  verificationStatus: VerificationStatus;
  verifiedByDoctorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedLabMetric {
  name: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceRange: string;
  isAbnormal?: boolean;
}

export interface ExtractedClinicalData {
  reportDate?: string;
  facilityName?: string;
  patientName?: string;
  referringDoctor?: string;
  metrics: ExtractedLabMetric[];
  clinicalImpressions?: string[];
  rawText: string;
}

// Prescriptions & Encounters
export interface MedicationItemDTO {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PrescriptionDTO {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  encounterId?: string;
  diagnosis: string;
  clinicalNotes?: string;
  medications: MedicationItemDTO[];
  issuedAt: string;
  validUntil: string;
  createdAt: string;
}

export interface EncounterDTO {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  facilityId?: string;
  facilityName?: string;
  encounterDate: string;
  chiefComplaint: string;
  assessmentAndPlan: string;
  vitalSigns?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRateBpm?: number;
    respiratoryRate?: number;
    temperatureCelsius?: number;
    spo2Percentage?: number;
  };
  createdAt: string;
}

// Consent & Access
export interface ConsentGrantDTO {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  organizationId?: string;
  organizationName?: string;
  purpose: AccessPurpose;
  allowedCategories: RecordCategory[];
  status: ConsentStatus;
  expiresAt: string;
  revokedAt?: string;
  revocationReason?: string;
  createdAt: string;
}

export interface AccessRequestDTO {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  purpose: AccessPurpose;
  requestedCategories: RecordCategory[];
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  respondedAt?: string;
}

export interface AccessAuditEventDTO {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  targetPatientId?: string;
  targetPatientName?: string;
  resourceType: string;
  resourceId?: string;
  action: AuditActionType;
  isEmergencyOverride: boolean;
  overrideJustification?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'DENIED';
  denialReason?: string;
  timestamp: string;
}

// Appointments
export interface AppointmentSlotDTO {
  id: string;
  doctorId: string;
  doctorName: string;
  facilityId: string;
  facilityName: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface AppointmentDTO {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  facilityId: string;
  facilityName: string;
  slotId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  reasonForVisit: string;
  notes?: string;
  bookingReference: string;
  createdAt: string;
}

// AI Assistant
export interface AIMessageDTO {
  id: string;
  conversationId: string;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  triageUrgency?: TriageUrgency;
  isRedFlagWarning?: boolean;
  emergencyDirectives?: string[];
  disclaimer: string;
  timestamp: string;
}

export interface AIConversationDTO {
  id: string;
  userId: string;
  title: string;
  messages: AIMessageDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface TriageResult {
  urgency: TriageUrgency;
  isEmergency: boolean;
  matchedRedFlags: string[];
  recommendedAction: string;
  emergencyNumber: string;
  disclaimer: string;
}

// Doctor Facility Affiliation & Document Integrity
export interface DoctorFacilityAffiliationDTO {
  id: string;
  doctorId: string;
  facilityId: string;
  facilityName: string;
  facilityType: string;
  facilityAddress: string;
  facilityCity: string;
  consultationFee?: number;
  scheduleDays?: string;
  roomOrOpdNumber?: string;
  isPrimary: boolean;
}

export interface DocumentIntegrityResultDTO {
  documentId: string;
  sha256Hash: string;
  isVerified: boolean;
  verificationMethod: string;
  verifiedAt: string;
}

// API Responses
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  timestamp: string;
}


// Doctor Availability & LiveCare Consultations
export enum ConsultationSessionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TimeWindowStatus {
  BEFORE_WINDOW = 'BEFORE_WINDOW',
  WINDOW_OPEN = 'WINDOW_OPEN',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface DoctorAvailabilityDTO {
  id: string;
  doctorId: string;
  facilityId: string;
  facilityName?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  maxDailyPatients: number;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailabilityExceptionDTO {
  id: string;
  doctorId: string;
  date: string;
  isAvailable: boolean;
  reason?: string | null;
  customStartTime?: string | null;
  customEndTime?: string | null;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  createdAt: string;
}

export interface ConsultationSessionDTO {
  id: string;
  appointmentId: string;
  roomName: string;
  status: ConsultationSessionStatus;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  doctorJoinedAt?: string | null;
  patientJoinedAt?: string | null;
  windowStatus: TimeWindowStatus;
  canJoin: boolean;
  opensInSeconds?: number;
  remainingSeconds?: number;
  appointment?: any;
  doctor?: any;
  patient?: any;
}

export interface ConsultationMessageDTO {
  id: string;
  sessionId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  sharedDocumentId?: string | null;
  sharedDocument?: any;
  createdAt: string;
}

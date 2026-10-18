import { z } from 'zod';
import { UserRole, RecordCategory, AccessPurpose, AppointmentStatus, FacilityType } from '@healthsync/shared-types';

export const passwordValidator = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordValidator,
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  role: z.nativeEnum(UserRole),
  phoneNumber: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const registerPatientSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordValidator,
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  address: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(12),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
});
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;

export const registerDoctorSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordValidator,
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  phoneNumber: z.string().optional(),
  licenseNumber: z.string().min(3, 'Medical license number is required').max(50),
  specialty: z.string().min(2, 'Specialty is required').max(80),
  experienceYears: z.number().min(0).max(70).default(0),
  consultationFee: z.number().min(0).default(0),
  bio: z.string().max(1000).optional(),
  facilityId: z.string().uuid().optional(),
});
export type RegisterDoctorInput = z.infer<typeof registerDoctorSchema>;

export const registerHospitalAdminSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordValidator,
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  phoneNumber: z.string().optional(),
  organizationName: z.string().min(2, 'Hospital or Clinic name is required').max(150),
  legalType: z.enum(['HOSPITAL', 'CLINIC_CHAIN', 'DAYCARE_SURGERY']).default('HOSPITAL'),
  facilityType: z.nativeEnum(FacilityType).default(FacilityType.GENERAL_HOSPITAL),
  licenseNumber: z.string().min(3, 'Facility registration / license number is required').max(50),
  address: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(12),
  contactPhone: z.string().min(6).max(25),
  contactEmail: z.string().email('Please enter a valid organization email'),
  hasEmergencyUnit: z.boolean().default(false),
  operatingHours: z.string().max(100).default('24/7'),
  specialties: z.string().max(300).default('General Medicine'),
  availableServices: z.string().max(300).default('Consultation, Pharmacy'),
});
export type RegisterHospitalAdminInput = z.infer<typeof registerHospitalAdminSchema>;

export const registerLabAdminSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordValidator,
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().min(1, 'Last name is required').max(60),
  phoneNumber: z.string().optional(),
  labName: z.string().min(2, 'Laboratory name is required').max(150),
  licenseNumber: z.string().min(3, 'Laboratory license number is required').max(50),
  accreditation: z.string().max(100).default('NABL, ISO 15189'),
  address: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(12),
  contactPhone: z.string().min(6).max(25),
  contactEmail: z.string().email('Please enter a valid lab email'),
  availableTests: z.string().min(3, 'List of available diagnostic tests is required').max(1000),
});
export type RegisterLabAdminInput = z.infer<typeof registerLabAdminSchema>;

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const patientProfileSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  address: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(12),
  emergencyContactName: z.string().min(2).max(100),
  emergencyContactPhone: z.string().min(8).max(20),
  emergencyContactRelation: z.string().min(2).max(50),
  heightCm: z.number().min(30).max(250).optional(),
  weightKg: z.number().min(1).max(350).optional(),
  knownAllergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
});

export type PatientProfileInput = z.infer<typeof patientProfileSchema>;

export const consentGrantSchema = z.object({
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  purpose: z.nativeEnum(AccessPurpose),
  allowedCategories: z.array(z.nativeEnum(RecordCategory)).min(1, 'At least one record category must be granted'),
  expiresInDays: z.number().min(1).max(365).default(30),
});

export type ConsentGrantInput = z.infer<typeof consentGrantSchema>;

export const accessRequestSchema = z.object({
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  purpose: z.nativeEnum(AccessPurpose),
  requestedCategories: z.array(z.nativeEnum(RecordCategory)).min(1, 'At least one category must be requested'),
  reason: z.string().min(10, 'Clinical justification must be at least 10 characters long').max(500),
});

export type AccessRequestInput = z.infer<typeof accessRequestSchema>;

export const breakGlassSchema = z.object({
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  justification: z
    .string()
    .min(20, 'Break-glass access requires a rigorous clinical emergency justification (min 20 characters)')
    .max(1000),
  confirmedEmergency: z.literal(true, {
    errorMap: () => ({ message: 'You must certify that this is a life-threatening clinical emergency' }),
  }),
});

export type BreakGlassInput = z.infer<typeof breakGlassSchema>;

export const documentUploadMetaSchema = z.object({
  title: z.string().min(2, 'Document title is required').max(150),
  category: z.nativeEnum(RecordCategory),
  description: z.string().max(500).optional(),
  patientId: z.string().uuid().optional(), // If uploaded by doctor/lab for patient
});

export type DocumentUploadMetaInput = z.infer<typeof documentUploadMetaSchema>;

export const prescriptionCreateSchema = z.object({
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  diagnosis: z.string().min(2, 'Diagnosis is required').max(200),
  clinicalNotes: z.string().max(2000).optional(),
  medications: z
    .array(
      z.object({
        name: z.string().min(1, 'Medication name is required'),
        dosage: z.string().min(1, 'Dosage is required (e.g. 500mg)'),
        frequency: z.string().min(1, 'Frequency is required (e.g. 1-0-1 or Twice daily)'),
        duration: z.string().min(1, 'Duration is required (e.g. 5 days)'),
        instructions: z.string().optional(),
      }),
    )
    .min(1, 'Prescription must contain at least one medication'),
  validDays: z.number().min(1).max(180).default(30),
});

export type PrescriptionCreateInput = z.infer<typeof prescriptionCreateSchema>;

export const appointmentBookingSchema = z.object({
  slotId: z.string().uuid('Slot ID must be a valid UUID'),
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  facilityId: z.string().uuid('Facility ID must be a valid UUID'),
  reasonForVisit: z.string().min(5, 'Reason for visit must be at least 5 characters').max(300),
});

export type AppointmentBookingInput = z.infer<typeof appointmentBookingSchema>;

export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  conversationId: z.string().uuid().optional(),
  language: z.enum(['en', 'hi', 'hinglish']).default('en'),
});

export type AIChatInput = z.infer<typeof aiChatSchema>;

export const facilitySearchSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().min(1).max(100).default(10),
  specialty: z.string().optional(),
  facilityType: z.nativeEnum(FacilityType).optional(),
  searchQuery: z.string().optional(),
});

export type FacilitySearchInput = z.infer<typeof facilitySearchSchema>;

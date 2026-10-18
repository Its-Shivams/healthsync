import { AuthService } from '../src/auth/auth.service';
import { UserRole } from '@healthsync/shared-types';
import { ConflictException } from '@nestjs/common';

describe('HealthSync 4-Role Registration & Verification Engine', () => {
  let mockPrisma: any;
  let mockJwt: any;
  let authService: AuthService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      doctorProfile: {
        findUnique: jest.fn(),
      },
      healthcareOrganization: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      laboratory: {
        findFirst: jest.fn(),
      },
      accessAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockJwt = {
      sign: jest.fn().mockReturnValue('mock-jwt-token-xyz'),
    };

    authService = new AuthService(mockPrisma as any, mockJwt as any);
  });

  describe('Patient Registration Flow', () => {
    it('should successfully register a patient and generate access code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation((args: any) => ({
        id: 'patient-user-1',
        email: args.data.email,
        firstName: args.data.firstName,
        lastName: args.data.lastName,
        role: UserRole.PATIENT,
        isActive: true,
        patientProfile: {
          id: 'patient-profile-1',
          dateOfBirth: args.data.patientProfile.create.dateOfBirth,
          accessCode: args.data.patientProfile.create.accessCode,
        },
      }));

      const res = await authService.registerPatient({
        email: 'new.patient@test.mock',
        password: 'ValidPassword@123',
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: '1992-05-10',
        gender: 'MALE',
        bloodGroup: 'O+',
        address: '10 Civil Lines',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110054',
      });

      expect(res.user.role).toBe(UserRole.PATIENT);
      expect(res.token).toBe('mock-jwt-token-xyz');
      expect(res.user.patientProfile.accessCode).toMatch(/^HS-\d{4}$/);
    });

    it('should throw ConflictException if patient email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.registerPatient({
          email: 'existing@test.mock',
          password: 'ValidPassword@123',
          firstName: 'Aarav',
          lastName: 'Sharma',
          dateOfBirth: '1992-05-10',
          gender: 'MALE',
          bloodGroup: 'O+',
          address: '10 Civil Lines',
          city: 'Delhi',
          state: 'Delhi',
          postalCode: '110054',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Doctor Registration & Unverified Status Flow', () => {
    it('should enforce PENDING_REVIEW verification status upon doctor registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.doctorProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation((args: any) => {
        // Assert backend strictly sets PENDING_REVIEW
        expect(args.data.doctorProfile.create.verificationStatus).toBe('PENDING_REVIEW');
        return {
          id: 'doc-user-1',
          email: args.data.email,
          role: UserRole.DOCTOR,
          isActive: true,
          doctorProfile: {
            id: 'doc-profile-1',
            licenseNumber: args.data.doctorProfile.create.licenseNumber,
            verificationStatus: args.data.doctorProfile.create.verificationStatus,
          },
        };
      });

      const res = await authService.registerDoctor({
        email: 'dr.new@test.mock',
        password: 'ValidPassword@123',
        firstName: 'Priya',
        lastName: 'Nair',
        licenseNumber: 'NMC-DEL-2024-9988',
        specialty: 'CARDIOLOGY',
        experienceYears: 10,
        consultationFee: 1200,
      });

      expect(res.user.role).toBe(UserRole.DOCTOR);
      expect(res.user.doctorProfile.verificationStatus).toBe('PENDING_REVIEW');
    });

    it('should reject doctor registration with duplicate medical license number', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'existing-doc' });

      await expect(
        authService.registerDoctor({
          email: 'dr.duplicate@test.mock',
          password: 'ValidPassword@123',
          firstName: 'Duplicate',
          lastName: 'Doctor',
          licenseNumber: 'NMC-DEL-2024-9988',
          specialty: 'CARDIOLOGY',
          experienceYears: 5,
          consultationFee: 800,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Hospital Administrator Registration Flow', () => {
    it('should register hospital organization and facility in UNVERIFIED state', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.healthcareOrganization.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'hosp-admin-user',
        email: 'admin@cityhospital.mock',
        role: UserRole.HOSPITAL_ADMIN,
        isActive: true,
      });
      mockPrisma.healthcareOrganization.create.mockImplementation((args: any) => {
        // Assert organization and facility are both unverified
        expect(args.data.isVerified).toBe(false);
        expect(args.data.facilities.create.isVerified).toBe(false);
        return {
          id: 'org-1',
          name: args.data.name,
          isVerified: false,
          facilities: [{ id: 'fac-1', name: args.data.facilities.create.name, isVerified: false }],
        };
      });

      const res = await authService.registerHospitalAdmin({
        email: 'admin@cityhospital.mock',
        password: 'ValidPassword@123',
        firstName: 'Anita',
        lastName: 'Roy',
        organizationName: 'City General Hospital',
        legalType: 'HOSPITAL',
        facilityType: 'GENERAL_HOSPITAL' as any,
        licenseNumber: 'HOSP-2024-7711',
        address: '44 Ring Road',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110024',
        contactPhone: '+91-11-23344556',
        contactEmail: 'contact@cityhospital.mock',
        hasEmergencyUnit: true,
        operatingHours: '24/7 Emergency',
        specialties: 'Emergency, Cardiology, Pediatrics',
        availableServices: 'ICU, Trauma, Pharmacy',
      });

      expect(res.user.role).toBe(UserRole.HOSPITAL_ADMIN);
      expect((res.user as any).organization.isVerified).toBe(false);
      expect((res.user as any).organization.facilities[0].isVerified).toBe(false);
    });
  });

  describe('Laboratory Administrator Registration Flow', () => {
    it('should register laboratory organization and laboratory in UNVERIFIED state', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.laboratory.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'lab-admin-user',
        email: 'director@metrodiagnostic.mock',
        role: UserRole.LAB_ADMIN,
        isActive: true,
      });
      mockPrisma.healthcareOrganization.create.mockImplementation((args: any) => {
        expect(args.data.isVerified).toBe(false);
        expect(args.data.laboratories.create.isVerified).toBe(false);
        return {
          id: 'lab-org-1',
          name: args.data.name,
          isVerified: false,
          laboratories: [{ id: 'lab-1', name: args.data.laboratories.create.name, isVerified: false }],
        };
      });

      const res = await authService.registerLabAdmin({
        email: 'director@metrodiagnostic.mock',
        password: 'ValidPassword@123',
        firstName: 'Sunil',
        lastName: 'Varma',
        labName: 'Metro Advanced Pathology Lab',
        licenseNumber: 'LAB-2024-8833',
        accreditation: 'NABL, ISO 15189',
        address: '55 Okhla Phase 3',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110020',
        contactPhone: '+91-11-44556677',
        contactEmail: 'lab@metrodiagnostic.mock',
        availableTests: 'Complete Blood Count (CBC), Lipid Panel, LFT, KFT, HbA1c',
      });

      expect(res.user.role).toBe(UserRole.LAB_ADMIN);
      expect((res.user as any).organization.isVerified).toBe(false);
      expect((res.user as any).laboratory.isVerified).toBe(false);
    });
  });
});

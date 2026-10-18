import { AuthService } from '../src/auth/auth.service';
import { AuthController } from '../src/auth/auth.controller';
import { PatientsService } from '../src/patients/patients.service';
import { UserRole } from '@healthsync/shared-types';
import { NotFoundException } from '@nestjs/common';

describe('Regression: Logout Invalidation & New Patient Feature Access', () => {
  let mockPrisma: any;
  let mockJwt: any;
  let authService: AuthService;
  let authController: AuthController;
  let patientsService: PatientsService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      patientProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      emergencyContact: {
        create: jest.fn().mockResolvedValue({ id: 'ec-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      allergy: {
        create: jest.fn().mockResolvedValue({ id: 'all-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      condition: {
        create: jest.fn().mockResolvedValue({ id: 'cond-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      medicalDocument: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      medicalReport: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      prescription: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      encounter: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      dailyHealthLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      accessAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockJwt = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
      decode: jest.fn().mockReturnValue({
        sub: 'user-patient-123',
        email: 'new.patient@test.mock',
        role: UserRole.PATIENT,
        patientProfileId: 'patient-profile-123',
      }),
    };

    authService = new AuthService(mockPrisma as any, mockJwt as any);
    authController = new AuthController(authService);
    patientsService = new PatientsService(mockPrisma as any);
  });

  describe('Bug 1: Logout Invalidation & Audit Verification', () => {
    it('should decode session token and record a LOGOUT audit event in database', async () => {
      await authService.logout('mock.jwt.token');

      expect(mockJwt.decode).toHaveBeenCalledWith('mock.jwt.token');
      expect(mockPrisma.accessAuditEvent.create).toHaveBeenCalledWith({
        data: {
          actorUserId: 'user-patient-123',
          targetPatientId: 'patient-profile-123',
          resourceType: 'AUTH',
          action: 'LOGOUT',
          status: 'SUCCESS',
        },
      });
    });

    it('should safely handle logout when no session token is provided without throwing', async () => {
      await expect(authService.logout(undefined)).resolves.not.toThrow();
      expect(mockPrisma.accessAuditEvent.create).not.toHaveBeenCalled();
    });

    it('should safely handle malformed or undecodable tokens without failing', async () => {
      mockJwt.decode.mockReturnValue(null);
      await expect(authService.logout('corrupted-token')).resolves.not.toThrow();
      expect(mockPrisma.accessAuditEvent.create).not.toHaveBeenCalled();
    });

    it('AuthController.logout should audit session and clear healthsync_session cookie with path /', async () => {
      const mockReq = {
        cookies: { healthsync_session: 'mock.jwt.token' },
        headers: {},
      } as any;

      const mockRes = {
        clearCookie: jest.fn(),
      } as any;

      const result = await authController.logout(mockReq, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('healthsync_session', {
        httpOnly: true,
        secure: false, // In test env
        sameSite: 'lax',
        path: '/',
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.accessAuditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGOUT',
            actorUserId: 'user-patient-123',
          }),
        })
      );
    });
  });

  describe('Bug 2: New Patient Registration & Initialized Features', () => {
    it('should register a new patient with PATIENT role, patientProfile and consultation accessCode', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation((args: any) => ({
        id: 'new-user-uuid',
        email: args.data.email,
        firstName: args.data.firstName,
        lastName: args.data.lastName,
        role: UserRole.PATIENT,
        isActive: true,
        patientProfile: {
          id: 'new-profile-uuid',
          dateOfBirth: args.data.patientProfile.create.dateOfBirth,
          gender: args.data.patientProfile.create.gender,
          bloodGroup: args.data.patientProfile.create.bloodGroup,
          accessCode: args.data.patientProfile.create.accessCode,
          address: args.data.patientProfile.create.address,
          city: args.data.patientProfile.create.city,
          state: args.data.patientProfile.create.state,
          postalCode: args.data.patientProfile.create.postalCode,
        },
      }));

      const result = await authService.registerPatient({
        email: 'rohit.kumar@healthsync.mock',
        password: 'SecurePassword@123',
        firstName: 'Rohit',
        lastName: 'Kumar',
        phoneNumber: '+91-9876500001',
        dateOfBirth: '1996-08-22',
        gender: 'MALE',
        bloodGroup: 'B+',
        address: '42 Ring Road',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110024',
        heightCm: 178,
        weightKg: 74,
      });

      expect(result.user.role).toBe(UserRole.PATIENT);
      expect(result.user.patientProfile).toBeDefined();
      expect(result.user.patientProfile.accessCode).toMatch(/^HS-\d{4}$/);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'new-user-uuid',
          email: 'rohit.kumar@healthsync.mock',
          role: UserRole.PATIENT,
          patientProfileId: 'new-profile-uuid',
        })
      );
    });

    it('PatientsService.getProfile should retrieve initialized patient profile with relationships', async () => {
      const mockPatientUser = {
        id: 'user-1',
        patientProfileId: 'profile-1',
        role: UserRole.PATIENT,
      };

      mockPrisma.patientProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        dateOfBirth: new Date('1996-08-22'),
        gender: 'MALE',
        bloodGroup: 'B+',
        accessCode: 'HS-4491',
        emergencyContacts: [],
        allergies: [],
        conditions: [],
        user: {
          id: 'user-1',
          email: 'rohit.kumar@healthsync.mock',
          firstName: 'Rohit',
          lastName: 'Kumar',
        },
      });

      const profile = await patientsService.getProfile(mockPatientUser);

      expect(profile.id).toBe('profile-1');
      expect(profile.accessCode).toBe('HS-4491');
      expect(profile.emergencyContacts).toEqual([]);
      expect(profile.allergies).toEqual([]);
      expect(profile.conditions).toEqual([]);
    });

    it('PatientsService.updateProfile should update demographics, emergency contact, allergies, and conditions', async () => {
      const mockPatientUser = {
        id: 'user-1',
        patientProfileId: 'profile-1',
        role: UserRole.PATIENT,
      };

      mockPrisma.patientProfile.update.mockResolvedValue({
        id: 'profile-1',
        dateOfBirth: new Date('1996-08-22'),
      });

      mockPrisma.patientProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId: 'user-1',
        dateOfBirth: new Date('1996-08-22'),
        gender: 'MALE',
        bloodGroup: 'B+',
        emergencyContacts: [
          {
            id: 'ec-1',
            name: 'Sunita Kumar',
            phoneNumber: '+91-9876500002',
            relationship: 'Mother',
          },
        ],
        allergies: [{ id: 'all-1', allergen: 'Sulfa Drugs', severity: 'MODERATE' }],
        conditions: [{ id: 'cond-1', name: 'Mild Asthma', status: 'ACTIVE' }],
      });

      const updated = await patientsService.updateProfile(mockPatientUser, {
        dateOfBirth: '1996-08-22',
        gender: 'MALE',
        bloodGroup: 'B+',
        address: '42 Ring Road',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110024',
        emergencyContactName: 'Sunita Kumar',
        emergencyContactPhone: '+91-9876500002',
        emergencyContactRelation: 'Mother',
        heightCm: 178,
        weightKg: 74,
        knownAllergies: ['Sulfa Drugs'],
        chronicConditions: ['Mild Asthma'],
      });

      expect(mockPrisma.emergencyContact.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.emergencyContact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Sunita Kumar',
          phoneNumber: '+91-9876500002',
          relationship: 'Mother',
        }),
      });
      expect(mockPrisma.allergy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          allergen: 'Sulfa Drugs',
        }),
      });
      expect(mockPrisma.condition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Mild Asthma',
        }),
      });
      expect(updated.emergencyContacts[0].name).toBe('Sunita Kumar');
    });

    it('PatientsService.getVitalsTrends should return clean empty array for new patient without synthetic 2025 points', async () => {
      const mockNewPatientUser = {
        id: 'new-user-1',
        patientProfileId: 'new-profile-1',
        role: UserRole.PATIENT,
      };

      mockPrisma.encounter.findMany.mockResolvedValue([]);
      mockPrisma.medicalReport.findMany.mockResolvedValue([]);
      mockPrisma.dailyHealthLog.findMany.mockResolvedValue([]);

      const trends = await patientsService.getVitalsTrends(mockNewPatientUser);

      // Verify no hardcoded 2025 points are injected
      expect(trends).toEqual([]);
      expect(trends.length).toBe(0);
    });

    it('PatientsService.getVitalsTrends should accurately aggregate and sort real patient encounters and daily logs', async () => {
      const mockPatientUser = {
        id: 'patient-1',
        patientProfileId: 'profile-1',
        role: UserRole.PATIENT,
      };

      mockPrisma.encounter.findMany.mockResolvedValue([
        {
          encounterDate: new Date('2026-10-10'),
          bloodPressureSystolic: 120,
          bloodPressureDiastolic: 80,
          heartRateBpm: 72,
        },
      ]);
      mockPrisma.medicalReport.findMany.mockResolvedValue([]);
      mockPrisma.dailyHealthLog.findMany.mockResolvedValue([
        {
          logDate: new Date('2026-10-12'),
          bloodPressureSystolic: 122,
          bloodPressureDiastolic: 82,
          heartRateBpm: 70,
          bloodSugarFasting: 95,
        },
      ]);

      const trends = await patientsService.getVitalsTrends(mockPatientUser);

      expect(trends.length).toBe(2);
      expect(trends[0].date).toBe('2026-10-10');
      expect(trends[0].systolic).toBe(120);
      expect(trends[1].date).toBe('2026-10-12');
      expect(trends[1].systolic).toBe(122);
      expect(trends[1].bloodGlucose).toBe(95);
    });

    it('PatientsService.getMedicalTimeline should return empty array for new patient without error', async () => {
      const mockNewPatientUser = {
        id: 'new-user-1',
        patientProfileId: 'new-profile-1',
        role: UserRole.PATIENT,
      };

      const timeline = await patientsService.getMedicalTimeline(mockNewPatientUser);
      expect(timeline).toEqual([]);
    });

    it('PatientsService should throw NotFoundException when user lacks patientProfileId', async () => {
      const invalidUser = { id: 'admin-user', role: UserRole.PLATFORM_ADMIN };

      await expect(patientsService.getProfile(invalidUser)).rejects.toThrow(NotFoundException);
      await expect(patientsService.updateProfile(invalidUser, {} as any)).rejects.toThrow(NotFoundException);
    });
  });
});

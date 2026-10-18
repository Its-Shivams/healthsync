import { PatientsService } from '../src/patients/patients.service';
import { DoctorsService } from '../src/doctors/doctors.service';
import { DocumentsService } from '../src/documents/documents.service';
import { UserRole } from '@healthsync/shared-types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('HealthSync Vitals, Quick Access & Document Lifecycle Engine', () => {
  let mockPrisma: any;
  let mockAudit: any;
  let mockStorage: any;

  let patientsService: PatientsService;
  let doctorsService: DoctorsService;
  let documentsService: DocumentsService;

  beforeEach(() => {
    mockPrisma = {
      patientProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      dailyHealthLog: {
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      medicalDocument: {
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      oCRJob: { deleteMany: jest.fn() },
      medicalReport: { deleteMany: jest.fn() },
      documentVersion: { deleteMany: jest.fn() },
      accessAuditEvent: { create: jest.fn() },
      notification: { create: jest.fn() },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    mockAudit = {
      logEvent: jest.fn().mockResolvedValue(true),
    };

    mockStorage = {
      deleteFile: jest.fn().mockResolvedValue(true),
      getSignedDownloadUrl: jest.fn().mockResolvedValue('https://mock-s3/file.pdf'),
      getLocalFileBuffer: jest.fn().mockReturnValue(Buffer.from('test file content')),
      computeSha256: jest.fn().mockReturnValue('mock-hash-123'),
    };

    const mockConsent = {
      verifyConsent: jest.fn(),
    };

    const mockOcr = {
      enqueueOcrJob: jest.fn(),
    };

    patientsService = new PatientsService(mockPrisma as any);
    doctorsService = new DoctorsService(
      mockPrisma as any,
      mockConsent as any,
      mockAudit as any,
    );
    documentsService = new DocumentsService(
      mockPrisma as any,
      mockStorage as any,
      mockOcr as any,
      mockAudit as any,
    );
  });

  describe('PatientsService - Daily Health Logs & Rolling Averages', () => {
    it('should calculate rolling averages and hypertension status correctly', async () => {
      mockPrisma.dailyHealthLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          patientId: 'p-1',
          bloodPressureSystolic: 140,
          bloodPressureDiastolic: 90,
          bloodSugarFasting: 130,
          bloodSugarPostPrandial: 180,
          heartRateBpm: 75,
          weightKg: 78,
          logDate: new Date('2026-03-01'),
        },
        {
          id: 'log-2',
          patientId: 'p-1',
          bloodPressureSystolic: 130,
          bloodPressureDiastolic: 80,
          bloodSugarFasting: 120,
          bloodSugarPostPrandial: 160,
          heartRateBpm: 71,
          weightKg: 78,
          logDate: new Date('2026-03-02'),
        },
      ]);

      const user = { patientProfileId: 'p-1', role: UserRole.PATIENT };
      const result = await patientsService.getDailyHealthLogs(user);

      expect(result.logs.length).toBe(2);
      expect(result.summary.avgSystolic).toBe(135);
      expect(result.summary.avgDiastolic).toBe(85);
      expect(result.summary.avgFastingSugar).toBe(125);
      expect(result.summary.avgPostPrandialSugar).toBe(170);
      expect(result.summary.avgHeartRate).toBe(73);
      expect(result.summary.avgWeight).toBe(78);
      expect(result.summary.bpCategory).toBe('Stage 1 Hypertension (130-139/80-89)');
      expect(result.summary.sugarCategory).toBe('Pre-diabetes / Impaired Fasting (100-125 mg/dL)');
    });

    it('should identify Stage 2 Hypertension when systolic >= 140 or diastolic >= 90', async () => {
      mockPrisma.dailyHealthLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          patientId: 'p-1',
          bloodPressureSystolic: 150,
          bloodPressureDiastolic: 95,
          bloodSugarFasting: 140,
          heartRateBpm: 80,
          logDate: new Date('2026-03-01'),
        },
      ]);

      const user = { patientProfileId: 'p-1', role: UserRole.PATIENT };
      const result = await patientsService.getDailyHealthLogs(user);

      expect(result.summary.bpCategory).toBe('Stage 2 Hypertension (≥140/90)');
      expect(result.summary.sugarCategory).toBe('Diabetic Range (≥126 mg/dL Fasting)');
    });

    it('should regenerate access code with format HS-XXXX', async () => {
      mockPrisma.patientProfile.update.mockImplementation(({ data }: any) => {
        return Promise.resolve({ id: 'p-1', accessCode: data.accessCode });
      });

      const user = { patientProfileId: 'p-1', role: UserRole.PATIENT };
      const result = await patientsService.regenerateAccessCode(user);

      expect(result.accessCode).toBeDefined();
      expect(result.accessCode.startsWith('HS-')).toBe(true);
      expect(result.accessCode.length).toBe(7); // e.g. HS-1234
    });
  });

  describe('DoctorsService - Quick Access by Patient ID & Access Code', () => {
    const mockPatientData = {
      id: 'p-aarav',
      accessCode: 'HS-8821',
      user: {
        id: 'u-aarav',
        firstName: 'Aarav',
        lastName: 'Sharma',
        email: 'patient.aarav@healthsync.mock',
      },
      allergies: [],
      conditions: [],
      dailyHealthLogs: [],
      medicalDocuments: [],
      prescriptions: [],
      encounters: [],
    };

    it('should unlock patient records when doctor supplies valid Patient ID and Access Code', async () => {
      mockPrisma.patientProfile.findFirst.mockResolvedValue(mockPatientData);

      const doctorUser = {
        id: 'u-doctor',
        doctorProfileId: 'doc-1',
        role: UserRole.DOCTOR,
      };

      const result = await doctorsService.quickAccessLookup(
        doctorUser,
        'patient.aarav@healthsync.mock',
        'HS-8821',
      );

      expect(result.verified).toBe(true);
      expect(result.patient.id).toBe('p-aarav');
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'u-doctor',
          targetPatientId: 'p-aarav',
          status: 'SUCCESS',
        }),
      );
    });

    it('should reject lookup and log security denial when Access Code does not match', async () => {
      mockPrisma.patientProfile.findFirst.mockResolvedValue(mockPatientData);

      const doctorUser = {
        id: 'u-doctor',
        doctorProfileId: 'doc-1',
        role: UserRole.DOCTOR,
      };

      await expect(
        doctorsService.quickAccessLookup(doctorUser, 'patient.aarav@healthsync.mock', 'WRONG-PIN'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'u-doctor',
          targetPatientId: 'p-aarav',
          status: 'DENIED',
          denialReason: expect.stringContaining('Invalid Patient Access Code'),
        }),
      );
    });

    it('should reject quick access request from unauthorized patient role', async () => {
      const patientUser = {
        id: 'u-other-patient',
        patientProfileId: 'p-2',
        role: UserRole.PATIENT,
      };

      await expect(
        doctorsService.quickAccessLookup(patientUser, 'p-aarav', 'HS-8821'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DocumentsService - Document Deletion & Authorization', () => {
    it('should allow patient to delete their own document and clean up storage', async () => {
      mockPrisma.medicalDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        title: 'Blood Test Report',
        patientId: 'p-1',
        uploadedByUserId: 'u-1',
        storageKey: 'documents/p-1/doc-1.pdf',
      });

      const user = { id: 'u-1', patientProfileId: 'p-1', role: UserRole.PATIENT };
      const res = await documentsService.deleteDocument('doc-1', user);

      expect(res.deleted).toBe(true);
      expect(mockStorage.deleteFile).toHaveBeenCalledWith('documents/p-1/doc-1.pdf');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should deny unauthorized patient from deleting another patient document', async () => {
      mockPrisma.medicalDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        title: 'Blood Test Report',
        patientId: 'p-other',
        uploadedByUserId: 'u-other',
        storageKey: 'documents/p-other/doc-1.pdf',
      });

      const intruder = { id: 'u-intruder', patientProfileId: 'p-intruder', role: UserRole.PATIENT };
      await expect(documentsService.deleteDocument('doc-1', intruder)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockStorage.deleteFile).not.toHaveBeenCalled();
    });
  });
});

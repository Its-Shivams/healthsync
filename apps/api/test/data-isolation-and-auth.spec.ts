import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, RecordCategory, ConsentStatus } from '@healthsync/shared-types';
import { DocumentsService } from '../src/documents/documents.service';
import { DoctorsService } from '../src/doctors/doctors.service';

describe('HealthSync Data Isolation, Authorization & Directory Security', () => {
  let mockPrisma: any;
  let mockStorage: any;
  let mockOcr: any;
  let mockAudit: any;
  let mockConsent: any;

  let documentsService: DocumentsService;
  let doctorsService: DoctorsService;

  beforeEach(() => {
    mockPrisma = {
      medicalDocument: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      patientProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      doctorProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      consentGrant: {
        findFirst: jest.fn(),
      },
      accessAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
      oCRJob: { deleteMany: jest.fn() },
      medicalReport: { deleteMany: jest.fn(), updateMany: jest.fn() },
      documentVersion: { deleteMany: jest.fn() },
    };

    mockStorage = {
      getSignedDownloadUrl: jest.fn().mockResolvedValue('https://mock-storage.local/signed-url'),
      computeSha256: jest.fn().mockReturnValue('mock-hash-1234'),
      uploadFile: jest.fn().mockResolvedValue(true),
      deleteFile: jest.fn().mockResolvedValue(true),
    };

    mockOcr = {
      processDocument: jest.fn().mockResolvedValue({ rawText: 'Sample text', metrics: [] }),
    };

    mockAudit = {
      logEvent: jest.fn().mockResolvedValue(true),
    };

    mockConsent = {
      verifyConsent: jest.fn(),
    };

    documentsService = new DocumentsService(
      mockPrisma as any,
      mockStorage as any,
      mockOcr as any,
      mockAudit as any,
    );

    doctorsService = new DoctorsService(
      mockPrisma as any,
      mockConsent as any,
      mockAudit as any,
    );
  });

  describe('Cross-Patient Data Isolation', () => {
    it('should deny Patient A from accessing Patient B document list', async () => {
      const patientAUser = {
        id: 'user-patient-a',
        role: UserRole.PATIENT,
        patientProfileId: 'profile-a',
      };

      mockPrisma.medicalDocument.findUnique.mockResolvedValue({
        id: 'doc-b',
        patientId: 'profile-b',
        title: 'Sunita CBC',
      });

      // Patient A attempts to view Patient B's document
      await expect(
        documentsService.getDocumentById('doc-b', patientAUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Patient A to query their own documents', async () => {
      const patientAUser = {
        id: 'user-patient-a',
        role: UserRole.PATIENT,
        patientProfileId: 'profile-a',
      };

      mockPrisma.medicalDocument.findMany.mockImplementation((args: any) => {
        expect(args.where.patientId).toBe('profile-a');
        return [
          {
            id: 'doc-1',
            patientId: 'profile-a',
            title: 'Aarav Blood Test',
            storageKey: 'patients/profile-a/test.pdf',
            fileName: 'test.pdf',
          },
        ];
      });

      const docs = await documentsService.getPatientDocuments(patientAUser);
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe('doc-1');
    });

    it('should prevent Patient A from deleting Patient B document', async () => {
      const patientAUser = {
        id: 'user-patient-a',
        role: UserRole.PATIENT,
        patientProfileId: 'profile-a',
      };

      mockPrisma.medicalDocument.findUnique.mockResolvedValue({
        id: 'doc-b',
        patientId: 'profile-b', // Belongs to Patient B
        uploadedByUserId: 'user-patient-b',
        title: 'Sunita Metabolic Panel',
      });

      await expect(
        documentsService.deleteDocument('doc-b', patientAUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Doctor Unauthorized Record Access Prevention', () => {
    it('should reject doctor record view when consent is not granted and no break-glass provided', async () => {
      const doctorUser = {
        id: 'doc-user-1',
        role: UserRole.DOCTOR,
        doctorProfileId: 'doc-profile-1',
      };

      mockConsent.verifyConsent.mockResolvedValue({
        isAllowed: false,
        grant: null,
      });

      await expect(
        doctorsService.getPatientAuthorizedRecords(doctorUser, 'patient-target-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject consultation quick-access if invalid patient access PIN is entered', async () => {
      const doctorUser = {
        id: 'doc-user-1',
        role: UserRole.DOCTOR,
        firstName: 'Priya',
        lastName: 'Nair',
      };

      mockPrisma.patientProfile.findFirst.mockResolvedValue({
        id: 'patient-target-id',
        accessCode: 'HS-8821', // Actual valid PIN
      });

      await expect(
        doctorsService.quickAccessLookup(doctorUser, 'patient-target-id', 'WRONG-PIN'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Doctor Directory Search & Specialty Filtering', () => {
    it('should query doctors with specialty filter containing CARDIOLOGY', async () => {
      mockPrisma.doctorProfile.findMany.mockImplementation((args: any) => {
        expect(args.where.specialties.some.name.contains).toBe('CARDIOLOGY');
        return [
          {
            id: 'doc-cardio-1',
            specialties: [{ name: 'CARDIOLOGY' }],
            experienceYears: 12,
            user: { firstName: 'Priya', lastName: 'Nair' },
          },
        ];
      });

      const result = await doctorsService.getDirectory({ specialty: 'CARDIOLOGY' });
      expect(result).toHaveLength(1);
      expect(result[0].user.firstName).toBe('Priya');
    });

    it('should query doctors with facility affiliation filter', async () => {
      mockPrisma.doctorProfile.findMany.mockImplementation((args: any) => {
        expect(args.where.affiliations.some.facilityId).toBe('facility-apex-1');
        return [
          {
            id: 'doc-apex-1',
            affiliations: [{ facilityId: 'facility-apex-1' }],
            user: { firstName: 'Rajesh', lastName: 'Rao' },
          },
        ];
      });

      const result = await doctorsService.getDirectory({ facilityId: 'facility-apex-1' });
      expect(result).toHaveLength(1);
      expect(result[0].user.firstName).toBe('Rajesh');
    });
  });
});

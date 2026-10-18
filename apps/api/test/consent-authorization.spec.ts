import { ConsentService } from '../src/consent/consent.service';
import { RecordCategory, AccessPurpose, ConsentStatus } from '@healthsync/shared-types';

describe('HealthSync Consent & Access Control Engine', () => {
  let mockPrisma: any;
  let mockAudit: any;
  let consentService: ConsentService;

  beforeEach(() => {
    mockPrisma = {
      doctorProfile: { findUnique: jest.fn() },
      patientProfile: { findUnique: jest.fn() },
      consentGrant: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      accessAuditEvent: { create: jest.fn() },
      notification: { create: jest.fn() },
    };

    mockAudit = {
      logEvent: jest.fn().mockResolvedValue(true),
    };

    consentService = new ConsentService(mockPrisma as any, mockAudit as any);
  });

  describe('verifyConsent() Rules', () => {
    it('should permit access when an active unexpired grant exists with matching category', async () => {
      mockPrisma.consentGrant.findFirst.mockResolvedValue({
        id: 'grant-123',
        patientId: 'patient-abc',
        doctorId: 'doctor-xyz',
        allowedCategories: 'LAB_REPORT,PRESCRIPTION',
        status: ConsentStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
      });

      const check = await consentService.verifyConsent('patient-abc', 'doctor-xyz', RecordCategory.LAB_REPORT);
      expect(check.isAllowed).toBe(true);
      expect(check.grant).toBeDefined();
    });

    it('should deny access when NO active grant exists between doctor and patient', async () => {
      mockPrisma.consentGrant.findFirst.mockResolvedValue(null);

      const check = await consentService.verifyConsent('patient-abc', 'doctor-unauthorized', RecordCategory.LAB_REPORT);
      expect(check.isAllowed).toBe(false);
      expect(check.reason).toContain('NO_ACTIVE_CONSENT_GRANT');
    });

    it('should deny access when category is restricted (e.g. only LAB_REPORT granted, but doctor requests IMAGING)', async () => {
      mockPrisma.consentGrant.findFirst.mockResolvedValue({
        id: 'grant-123',
        patientId: 'patient-abc',
        doctorId: 'doctor-xyz',
        allowedCategories: 'LAB_REPORT,PRESCRIPTION',
        status: ConsentStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
      });

      const check = await consentService.verifyConsent('patient-abc', 'doctor-xyz', RecordCategory.IMAGING);
      expect(check.isAllowed).toBe(false);
      expect(check.reason).toContain('CATEGORY_RESTRICTED');
    });
  });

  describe('Revocation Behavior', () => {
    it('should mark grant as REVOKED and emit an audit log', async () => {
      mockPrisma.consentGrant.findUnique.mockResolvedValue({
        id: 'grant-123',
        patientId: 'patient-profile-id',
        doctorId: 'doc-1',
        doctor: { userId: 'doc-user-1' },
      });
      mockPrisma.consentGrant.update.mockResolvedValue({
        id: 'grant-123',
        status: ConsentStatus.REVOKED,
      });

      const user = { role: 'PATIENT', patientProfileId: 'patient-profile-id', id: 'user-p' };
      const res = await consentService.revokeGrant(user, 'grant-123', 'No longer consulting this physician');

      expect(res.status).toBe(ConsentStatus.REVOKED);
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CONSENT_REVOKE',
          targetPatientId: 'patient-profile-id',
        }),
      );
    });
  });
});

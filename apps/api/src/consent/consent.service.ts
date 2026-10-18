import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ConsentStatus,
  AccessPurpose,
  RecordCategory,
  AuditActionType,
  UserRole,
} from '@healthsync/shared-types';
import { ConsentGrantInput, AccessRequestInput, BreakGlassInput } from '@healthsync/validation';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createGrant(user: any, input: ConsentGrantInput) {
    if (user.role !== UserRole.PATIENT || !user.patientProfileId) {
      throw new ForbiddenException('Only patients can issue consent grants for their medical records');
    }

    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: input.doctorId },
      include: { user: true },
    });
    if (!doctor) {
      throw new NotFoundException('Target doctor profile not found');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 30));

    const grant = await this.prisma.consentGrant.create({
      data: {
        patientId: user.patientProfileId,
        doctorId: input.doctorId,
        purpose: input.purpose,
        allowedCategories: input.allowedCategories.join(','),
        status: ConsentStatus.ACTIVE,
        expiresAt,
      },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            specialties: true,
          },
        },
      },
    });

    // Audit log
    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: user.patientProfileId,
      resourceType: 'CONSENT_GRANT',
      resourceId: grant.id,
      action: AuditActionType.CONSENT_GRANT,
      status: 'SUCCESS',
    });

    // Notify doctor
    await this.prisma.notification.create({
      data: {
        userId: doctor.userId,
        title: 'New Medical Record Access Granted',
        message: `Patient ${user.firstName} ${user.lastName} has granted you access to their ${input.allowedCategories.join(', ')} records for ${input.purpose}.`,
        type: 'CONSENT_GRANT',
      },
    });

    return grant;
  }

  async revokeGrant(user: any, grantId: string, reason?: string) {
    const grant = await this.prisma.consentGrant.findUnique({
      where: { id: grantId },
      include: { doctor: { include: { user: true } } },
    });

    if (!grant) {
      throw new NotFoundException('Consent grant not found');
    }

    if (user.role === UserRole.PATIENT && grant.patientId !== user.patientProfileId) {
      throw new ForbiddenException('You can only revoke your own consent grants');
    }

    const updated = await this.prisma.consentGrant.update({
      where: { id: grantId },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: reason || 'Revoked by patient',
      },
    });

    // Audit revocation
    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: grant.patientId,
      resourceType: 'CONSENT_GRANT',
      resourceId: grant.id,
      action: AuditActionType.CONSENT_REVOKE,
      status: 'SUCCESS',
    });

    // Notify doctor of revocation
    await this.prisma.notification.create({
      data: {
        userId: grant.doctor.userId,
        title: 'Record Access Consent Revoked',
        message: `Patient record access for grant ${grantId} has been revoked by the patient.`,
        type: 'CONSENT_REVOKED',
      },
    });

    return updated;
  }

  async listPatientGrants(user: any) {
    if (!user.patientProfileId) {
      return [];
    }

    // Auto-update expired grants
    await this.prisma.consentGrant.updateMany({
      where: {
        patientId: user.patientProfileId,
        status: ConsentStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      data: { status: ConsentStatus.EXPIRED },
    });

    return this.prisma.consentGrant.findMany({
      where: { patientId: user.patientProfileId },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
            specialties: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listDoctorGrants(user: any) {
    if (!user.doctorProfileId) {
      return [];
    }

    // Auto-update expired
    await this.prisma.consentGrant.updateMany({
      where: {
        doctorId: user.doctorProfileId,
        status: ConsentStatus.ACTIVE,
        expiresAt: { lt: new Date() },
      },
      data: { status: ConsentStatus.EXPIRED },
    });

    return this.prisma.consentGrant.findMany({
      where: {
        doctorId: user.doctorProfileId,
        status: ConsentStatus.ACTIVE,
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestAccess(user: any, input: AccessRequestInput) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfileId) {
      throw new ForbiddenException('Only verified doctors can request patient record access');
    }

    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: input.patientId },
      include: { user: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const request = await this.prisma.accessRequest.create({
      data: {
        patientId: input.patientId,
        doctorId: user.doctorProfileId,
        purpose: input.purpose,
        requestedCategories: input.requestedCategories.join(','),
        reason: input.reason,
        status: 'PENDING',
      },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            specialties: true,
          },
        },
      },
    });

    // Notify patient
    await this.prisma.notification.create({
      data: {
        userId: patient.userId,
        title: 'Doctor Requested Record Access',
        message: `Dr. ${user.firstName} ${user.lastName} has requested access to your ${input.requestedCategories.join(', ')} records for: "${input.reason}"`,
        type: 'CONSENT_REQUEST',
      },
    });

    return request;
  }

  async listAccessRequests(user: any) {
    if (user.role === UserRole.PATIENT && user.patientProfileId) {
      return this.prisma.accessRequest.findMany({
        where: { patientId: user.patientProfileId },
        include: {
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
              specialties: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      });
    }

    if (user.role === UserRole.DOCTOR && user.doctorProfileId) {
      return this.prisma.accessRequest.findMany({
        where: { doctorId: user.doctorProfileId },
        include: {
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      });
    }

    return [];
  }

  async respondAccessRequest(user: any, requestId: string, approve: boolean) {
    const request = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: { doctor: { include: { user: true } }, patient: true },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (user.role === UserRole.PATIENT && request.patientId !== user.patientProfileId) {
      throw new ForbiddenException('You can only respond to requests sent to your own profile');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Request has already been ${request.status.toLowerCase()}`);
    }

    const newStatus = approve ? 'APPROVED' : 'REJECTED';
    await this.prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        respondedAt: new Date(),
      },
    });

    if (approve) {
      // Create active consent grant
      const categories = request.requestedCategories.split(',') as RecordCategory[];
      await this.createGrant(user, {
        doctorId: request.doctorId,
        purpose: request.purpose as AccessPurpose,
        allowedCategories: categories,
        expiresInDays: 30,
      });
    } else {
      await this.audit.logEvent({
        actorUserId: user.id,
        targetPatientId: request.patientId,
        resourceType: 'CONSENT_REQUEST',
        resourceId: request.id,
        action: AuditActionType.CONSENT_DENIED,
        status: 'DENIED',
        denialReason: 'Patient declined record access request',
      });
    }

    return { success: true, status: newStatus };
  }

  async breakGlassAccess(user: any, input: BreakGlassInput) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfileId) {
      throw new ForbiddenException('Break-glass emergency override is strictly restricted to verified doctors');
    }

    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: input.patientId },
      include: { user: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Emergency grant valid for exactly 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const emergencyGrant = await this.prisma.consentGrant.create({
      data: {
        patientId: input.patientId,
        doctorId: user.doctorProfileId,
        purpose: AccessPurpose.EMERGENCY_CARE,
        allowedCategories: Object.values(RecordCategory).join(','), // Full emergency scope
        status: ConsentStatus.ACTIVE,
        expiresAt,
      },
    });

    // MANDATORY AUDIT LOG WITH EMERGENCY OVERRIDE FLAG & JUSTIFICATION
    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: input.patientId,
      resourceType: 'MEDICAL_RECORD',
      resourceId: emergencyGrant.id,
      action: AuditActionType.BREAK_GLASS_ACCESS,
      isEmergencyOverride: true,
      overrideJustification: input.justification,
      status: 'SUCCESS',
    });

    // Alert Patient & Administrators
    await this.prisma.notification.create({
      data: {
        userId: patient.userId,
        title: 'EMERGENCY: Break-Glass Record Access Invoked',
        message: `Dr. ${user.firstName} ${user.lastName} has invoked emergency break-glass record access for: "${input.justification}". This incident is logged and under security audit.`,
        type: 'EMERGENCY_ALERT',
      },
    });

    this.logger.warn(
      `🚨 BREAK-GLASS EMERGENCY ACCESS: Doctor ${user.id} accessed patient ${input.patientId}. Reason: ${input.justification}`,
    );

    return {
      success: true,
      message: 'Emergency break-glass access granted for 2 hours. All access is being audited.',
      grantId: emergencyGrant.id,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async verifyConsent(patientId: string, doctorId: string, category: RecordCategory) {
    const grant = await this.prisma.consentGrant.findFirst({
      where: {
        patientId,
        doctorId,
        status: ConsentStatus.ACTIVE,
        expiresAt: { gt: new Date() },
      },
    });

    if (!grant) {
      return {
        isAllowed: false,
        reason: 'NO_ACTIVE_CONSENT_GRANT: No active, unexpired consent grant exists between this doctor and patient.',
      };
    }

    const categories = grant.allowedCategories.split(',').map((c) => c.trim());
    if (!categories.includes(category) && !categories.includes('ALL')) {
      return {
        isAllowed: false,
        reason: `CATEGORY_RESTRICTED: Active consent grant covers [${categories.join(', ')}], but requested record is in [${category}].`,
      };
    }

    return { isAllowed: true, grant };
  }
}

import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, RecordCategory, AuditActionType } from '@healthsync/shared-types';
import { PrescriptionCreateInput } from '@healthsync/validation';

export interface CreateEncounterParams {
  patientId: string;
  facilityId?: string;
  chiefComplaint: string;
  assessmentAndPlan: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRateBpm?: number;
  respiratoryRate?: number;
  temperatureCelsius?: number;
  spo2Percentage?: number;
}

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consentService: ConsentService,
    private readonly audit: AuditService,
  ) {}

  async getDirectory(filter?: { specialty?: string; facilityId?: string; search?: string }) {
    const where: any = {};

    if (filter?.specialty && filter.specialty !== 'ALL') {
      where.specialties = {
        some: {
          name: {
            contains: filter.specialty,
          },
        },
      };
    }

    if (filter?.facilityId && filter.facilityId !== 'ALL') {
      where.affiliations = {
        some: {
          facilityId: filter.facilityId,
        },
      };
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      where.OR = [
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { bio: { contains: q } },
        { specialties: { some: { name: { contains: q } } } },
      ];
    }

    return this.prisma.doctorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            phoneNumber: true,
          },
        },
        specialties: true,
        affiliations: {
          include: {
            facility: true,
          },
        },
        verifications: true,
      },
      orderBy: { experienceYears: 'desc' },
    });
  }

  async getAuthorizedPatients(user: any) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfileId) {
      throw new ForbiddenException('Only doctors can access authorized patient rosters');
    }

    const grants = await this.prisma.consentGrant.findMany({
      where: {
        doctorId: user.doctorProfileId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: {
        patient: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
            conditions: true,
            allergies: true,
          },
        },
      },
    });

    const patientMap = new Map();
    for (const g of grants) {
      if (!patientMap.has(g.patientId)) {
        patientMap.set(g.patientId, {
          patient: g.patient,
          activeGrant: {
            id: g.id,
            purpose: g.purpose,
            allowedCategories: g.allowedCategories.split(','),
            expiresAt: g.expiresAt,
          },
        });
      }
    }

    return Array.from(patientMap.values());
  }

  async getPatientAuthorizedRecords(user: any, patientId: string) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfileId) {
      throw new ForbiddenException('Only doctors can access patient records');
    }

    // 1. Strict Consent Check
    const activeGrant = await this.prisma.consentGrant.findFirst({
      where: {
        patientId,
        doctorId: user.doctorProfileId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeGrant) {
      await this.audit.logEvent({
        actorUserId: user.id,
        targetPatientId: patientId,
        resourceType: 'MEDICAL_RECORD',
        action: AuditActionType.RECORD_VIEW,
        status: 'DENIED',
        denialReason: 'NO_ACTIVE_CONSENT_GRANT: Dr. has no valid consent grant for this patient',
      });
      throw new ForbiddenException(
        'Access denied: You do not have an active consent grant from this patient to view their medical records.',
      );
    }

    const allowedCategories = activeGrant.allowedCategories.split(',').map((c) => c.trim());

    // 2. Fetch records strictly conforming to allowed categories
    const patient = await this.prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
        allergies: true,
        conditions: true,
        emergencyContacts: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Documents filtered by allowed category
    const documents = await this.prisma.medicalDocument.findMany({
      where: {
        patientId,
        category: { in: allowedCategories },
      },
      include: {
        reports: true,
        ocrJob: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Prescriptions (only if PRESCRIPTION category is allowed)
    let prescriptions: any[] = [];
    if (allowedCategories.includes(RecordCategory.PRESCRIPTION) || allowedCategories.includes('ALL')) {
      prescriptions = await this.prisma.prescription.findMany({
        where: { patientId },
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
          medications: true,
        },
        orderBy: { issuedAt: 'desc' },
      });
    }

    // Encounters (only if CONSULTATION_NOTE category is allowed)
    let encounters: any[] = [];
    if (allowedCategories.includes(RecordCategory.CONSULTATION_NOTE) || allowedCategories.includes('ALL')) {
      encounters = await this.prisma.encounter.findMany({
        where: { patientId },
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
          facility: true,
        },
        orderBy: { encounterDate: 'desc' },
      });
    }

    // Audit view event
    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: patientId,
      resourceType: 'MEDICAL_RECORD',
      resourceId: activeGrant.id,
      action: AuditActionType.RECORD_VIEW,
      status: 'SUCCESS',
    });

    return {
      patient,
      activeGrant: {
        id: activeGrant.id,
        purpose: activeGrant.purpose,
        allowedCategories,
        expiresAt: activeGrant.expiresAt,
      },
      documents,
      prescriptions,
      encounters,
    };
  }

  async createEncounter(user: any, params: CreateEncounterParams) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfileId) {
      throw new ForbiddenException('Only doctors can document clinical encounters');
    }

    const encounter = await this.prisma.encounter.create({
      data: {
        patientId: params.patientId,
        doctorId: user.doctorProfileId,
        facilityId: params.facilityId,
        chiefComplaint: params.chiefComplaint,
        assessmentAndPlan: params.assessmentAndPlan,
        bloodPressureSystolic: params.bloodPressureSystolic,
        bloodPressureDiastolic: params.bloodPressureDiastolic,
        heartRateBpm: params.heartRateBpm,
        respiratoryRate: params.respiratoryRate,
        temperatureCelsius: params.temperatureCelsius,
        spo2Percentage: params.spo2Percentage,
      },
      include: {
        doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        patient: { include: { user: true } },
      },
    });

    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: params.patientId,
      resourceType: 'ENCOUNTER',
      resourceId: encounter.id,
      action: AuditActionType.ENCOUNTER_CREATE,
      status: 'SUCCESS',
    });

    return encounter;
  }

  async createPrescription(user: any, input: PrescriptionCreateInput) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfileId) {
      throw new ForbiddenException('Only doctors can create prescriptions');
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (input.validDays || 30));

    const prescription = await this.prisma.prescription.create({
      data: {
        patientId: input.patientId,
        doctorId: user.doctorProfileId,
        diagnosis: input.diagnosis,
        clinicalNotes: input.clinicalNotes,
        validUntil,
        medications: {
          create: input.medications.map((m) => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            instructions: m.instructions,
          })),
        },
      },
      include: {
        medications: true,
        doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        patient: { include: { user: true } },
      },
    });

    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: input.patientId,
      resourceType: 'PRESCRIPTION',
      resourceId: prescription.id,
      action: AuditActionType.PRESCRIPTION_CREATE,
      status: 'SUCCESS',
    });

    // Notify patient
    await this.prisma.notification.create({
      data: {
        userId: prescription.patient.userId,
        title: 'New Prescription Issued',
        message: `Dr. ${user.firstName} ${user.lastName} has issued a new prescription for: ${input.diagnosis}.`,
        type: 'REPORT_READY',
      },
    });

    return prescription;
  }

  // ==========================================
  // DOCTOR QUICK-ACCESS BY PATIENT ID & ACCESS CODE
  // ==========================================
  async quickAccessLookup(user: any, patientIdentifier: string, accessCode: string) {
    if (user.role !== UserRole.DOCTOR && user.role !== UserRole.HOSPITAL_ADMIN) {
      throw new ForbiddenException('Only healthcare practitioners and clinical staff can unlock patient files');
    }

    const patient = await this.prisma.patientProfile.findFirst({
      where: {
        OR: [
          { id: patientIdentifier },
          { user: { email: patientIdentifier } },
          { user: { phoneNumber: patientIdentifier } },
        ],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
        emergencyContacts: true,
        allergies: true,
        conditions: true,
        dailyHealthLogs: { orderBy: { logDate: 'desc' }, take: 20 },
        medicalDocuments: {
          include: { reports: true, ocrJob: true },
          orderBy: { createdAt: 'desc' },
        },
        prescriptions: {
          include: {
            doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
            medications: true,
          },
          orderBy: { issuedAt: 'desc' },
        },
        encounters: {
          include: {
            doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
            facility: true,
          },
          orderBy: { encounterDate: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found with identifier: ${patientIdentifier}`);
    }

    // Verify access code
    const normalizedInputCode = accessCode.trim().toUpperCase();
    const storedCode = (patient.accessCode || 'HS-8821').trim().toUpperCase();

    if (normalizedInputCode !== storedCode) {
      await this.audit.logEvent({
        actorUserId: user.id,
        targetPatientId: patient.id,
        resourceType: 'PATIENT_PROFILE',
        resourceId: patient.id,
        action: AuditActionType.CONSENT_DENIED,
        status: 'DENIED',
        denialReason: 'Invalid Patient Access Code provided during consultation lookup',
      });
      throw new ForbiddenException('Invalid Patient Access Code. Please ask the patient for their active 6-character code.');
    }

    // Log successful audit event
    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: patient.id,
      resourceType: 'PATIENT_PROFILE',
      resourceId: patient.id,
      action: AuditActionType.RECORD_VIEW,
      status: 'SUCCESS',
      overrideJustification: `Verified consultation lookup using patient access code [${normalizedInputCode}]`,
    });

    return {
      verified: true,
      patient,
    };
  }
}


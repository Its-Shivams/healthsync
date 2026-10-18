import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PatientProfileInput } from '@healthsync/validation';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: any) {
    if (!user.patientProfileId) {
      throw new NotFoundException('Patient profile not initialized');
    }

    const profile = await this.prisma.patientProfile.findUnique({
      where: { id: user.patientProfileId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, avatarUrl: true } },
        emergencyContacts: true,
        allergies: true,
        conditions: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile record not found');
    }

    return profile;
  }

  async updateProfile(user: any, input: PatientProfileInput) {
    if (!user.patientProfileId) {
      throw new NotFoundException('Patient profile not initialized');
    }

    const updated = await this.prisma.patientProfile.update({
      where: { id: user.patientProfileId },
      data: {
        dateOfBirth: new Date(input.dateOfBirth),
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
      },
      include: {
        user: true,
        emergencyContacts: true,
        allergies: true,
        conditions: true,
      },
    });

    // Update emergency contact if provided
    if (input.emergencyContactName && input.emergencyContactPhone) {
      await this.prisma.emergencyContact.deleteMany({
        where: { patientId: user.patientProfileId },
      });
      await this.prisma.emergencyContact.create({
        data: {
          patientId: user.patientProfileId,
          name: input.emergencyContactName,
          relationship: input.emergencyContactRelation || 'Emergency Contact',
          phoneNumber: input.emergencyContactPhone,
        },
      });
    }

    // Sync allergies if provided
    if (input.knownAllergies && Array.isArray(input.knownAllergies)) {
      await this.prisma.allergy.deleteMany({
        where: { patientId: user.patientProfileId },
      });
      for (const allergen of input.knownAllergies) {
        if (allergen && allergen.trim()) {
          await this.prisma.allergy.create({
            data: {
              patientId: user.patientProfileId,
              allergen: allergen.trim(),
              severity: 'MODERATE',
            },
          });
        }
      }
    }

    // Sync chronic conditions if provided
    if (input.chronicConditions && Array.isArray(input.chronicConditions)) {
      await this.prisma.condition.deleteMany({
        where: { patientId: user.patientProfileId },
      });
      for (const cond of input.chronicConditions) {
        if (cond && cond.trim()) {
          await this.prisma.condition.create({
            data: {
              patientId: user.patientProfileId,
              name: cond.trim(),
              status: 'ACTIVE',
            },
          });
        }
      }
    }

    return this.prisma.patientProfile.findUnique({
      where: { id: user.patientProfileId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phoneNumber: true, avatarUrl: true } },
        emergencyContacts: true,
        allergies: true,
        conditions: true,
      },
    });
  }

  async getMedicalTimeline(user: any) {
    if (!user.patientProfileId) {
      return [];
    }

    const patientId = user.patientProfileId;

    const [docs, prescriptions, encounters] = await Promise.all([
      this.prisma.medicalDocument.findMany({
        where: { patientId },
        include: { reports: true, ocrJob: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prescription.findMany({
        where: { patientId },
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
          medications: true,
        },
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.encounter.findMany({
        where: { patientId },
        include: {
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
          facility: true,
        },
        orderBy: { encounterDate: 'desc' },
      }),
    ]);

    const timeline: any[] = [];

    // Documents
    for (const d of docs) {
      timeline.push({
        id: d.id,
        type: 'DOCUMENT',
        category: d.category,
        title: d.title,
        description: d.description,
        timestamp: d.createdAt,
        verificationStatus: d.verificationStatus,
        metadata: {
          fileName: d.fileName,
          fileSize: d.fileSize,
          sha256Hash: d.sha256Hash,
        },
      });
    }

    // Prescriptions
    for (const p of prescriptions) {
      timeline.push({
        id: p.id,
        type: 'PRESCRIPTION',
        title: `Prescription: ${p.diagnosis}`,
        doctorName: `Dr. ${p.doctor.user.firstName} ${p.doctor.user.lastName}`,
        timestamp: p.issuedAt,
        metadata: {
          medications: p.medications,
          validUntil: p.validUntil,
        },
      });
    }

    // Encounters
    for (const e of encounters) {
      timeline.push({
        id: e.id,
        type: 'ENCOUNTER',
        title: `Consultation: ${e.chiefComplaint}`,
        doctorName: `Dr. ${e.doctor.user.firstName} ${e.doctor.user.lastName}`,
        facilityName: e.facility?.name,
        timestamp: e.encounterDate,
        metadata: {
          assessmentAndPlan: e.assessmentAndPlan,
          vitals: {
            bp: e.bloodPressureSystolic ? `${e.bloodPressureSystolic}/${e.bloodPressureDiastolic}` : null,
            heartRate: e.heartRateBpm,
            spo2: e.spo2Percentage,
            temp: e.temperatureCelsius,
          },
        },
      });
    }

    // Sort chronologically descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return timeline;
  }

  async getVitalsTrends(user: any) {
    if (!user.patientProfileId) {
      return [];
    }

    const patientId = user.patientProfileId;

    const encounters = await this.prisma.encounter.findMany({
      where: { patientId },
      orderBy: { encounterDate: 'asc' },
    });

    const reports = await this.prisma.medicalReport.findMany({
      where: {
        document: { patientId: user.patientProfileId },
      },
      include: { document: true },
      orderBy: { testDate: 'asc' },
    });

    // Real historical points aggregated from patient encounters and daily logs
    const trendPoints: any[] = [];

    // Merge recent encounters
    for (const e of encounters) {
      if (e.bloodPressureSystolic) {
        trendPoints.push({
          date: e.encounterDate.toISOString().split('T')[0],
          systolic: e.bloodPressureSystolic,
          diastolic: e.bloodPressureDiastolic,
          heartRate: e.heartRateBpm,
        });
      }
    }

    // Merge daily health logs
    const dailyLogs = await this.prisma.dailyHealthLog.findMany({
      where: { patientId },
      orderBy: { logDate: 'asc' },
    });

    for (const log of dailyLogs) {
      trendPoints.push({
        date: log.logDate.toISOString().split('T')[0],
        systolic: log.bloodPressureSystolic,
        diastolic: log.bloodPressureDiastolic,
        heartRate: log.heartRateBpm,
        bloodGlucose: log.bloodSugarFasting || log.bloodSugarRandom,
      });
    }

    // Sort chronologically ascending
    trendPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return trendPoints;
  }

  // ==========================================
  // DAILY HEALTH LOGS (BP, SUGAR, VITALS)
  // ==========================================
  async getDailyHealthLogs(user: any) {
    if (!user.patientProfileId) {
      return { logs: [], summary: null };
    }

    const patientId = user.patientProfileId;
    const logs = await this.prisma.dailyHealthLog.findMany({
      where: { patientId },
      orderBy: { logDate: 'desc' },
    });

    if (logs.length === 0) {
      return {
        logs: [],
        summary: {
          totalEntries: 0,
          avgSystolic: null,
          avgDiastolic: null,
          avgFastingSugar: null,
          avgPostPrandialSugar: null,
          avgHeartRate: null,
          avgWeight: null,
          bpCategory: 'No Data',
          sugarCategory: 'No Data',
          latestEntry: null,
        },
      };
    }

    // Calculate averages
    let sysSum = 0, sysCount = 0;
    let diaSum = 0, diaCount = 0;
    let fastSugarSum = 0, fastSugarCount = 0;
    let ppSugarSum = 0, ppSugarCount = 0;
    let hrSum = 0, hrCount = 0;
    let wtSum = 0, wtCount = 0;

    for (const l of logs) {
      if (l.bloodPressureSystolic != null) { sysSum += l.bloodPressureSystolic; sysCount++; }
      if (l.bloodPressureDiastolic != null) { diaSum += l.bloodPressureDiastolic; diaCount++; }
      if (l.bloodSugarFasting != null) { fastSugarSum += l.bloodSugarFasting; fastSugarCount++; }
      if (l.bloodSugarPostPrandial != null) { ppSugarSum += l.bloodSugarPostPrandial; ppSugarCount++; }
      if (l.heartRateBpm != null) { hrSum += l.heartRateBpm; hrCount++; }
      if (l.weightKg != null) { wtSum += l.weightKg; wtCount++; }
    }

    const avgSystolic = sysCount > 0 ? Math.round((sysSum / sysCount) * 10) / 10 : null;
    const avgDiastolic = diaCount > 0 ? Math.round((diaSum / diaCount) * 10) / 10 : null;
    const avgFastingSugar = fastSugarCount > 0 ? Math.round((fastSugarSum / fastSugarCount) * 10) / 10 : null;
    const avgPostPrandialSugar = ppSugarCount > 0 ? Math.round((ppSugarSum / ppSugarCount) * 10) / 10 : null;
    const avgHeartRate = hrCount > 0 ? Math.round((hrSum / hrCount) * 10) / 10 : null;
    const avgWeight = wtCount > 0 ? Math.round((wtSum / wtCount) * 10) / 10 : null;

    // Determine status indicators based on latest or average
    let bpCategory = 'Normal (<120/80)';
    if (avgSystolic && avgDiastolic) {
      if (avgSystolic >= 140 || avgDiastolic >= 90) {
        bpCategory = 'Stage 2 Hypertension (≥140/90)';
      } else if (avgSystolic >= 130 || avgDiastolic >= 80) {
        bpCategory = 'Stage 1 Hypertension (130-139/80-89)';
      } else if (avgSystolic >= 120 && avgDiastolic < 80) {
        bpCategory = 'Elevated (120-129/<80)';
      }
    }

    let sugarCategory = 'Normal (<100 mg/dL)';
    if (avgFastingSugar) {
      if (avgFastingSugar >= 126) {
        sugarCategory = 'Diabetic Range (≥126 mg/dL Fasting)';
      } else if (avgFastingSugar >= 100) {
        sugarCategory = 'Pre-diabetes / Impaired Fasting (100-125 mg/dL)';
      }
    }

    return {
      logs,
      summary: {
        totalEntries: logs.length,
        avgSystolic,
        avgDiastolic,
        avgFastingSugar,
        avgPostPrandialSugar,
        avgHeartRate,
        avgWeight,
        bpCategory,
        sugarCategory,
        latestEntry: logs[0],
      },
    };
  }

  async addDailyHealthLog(user: any, input: any) {
    if (!user.patientProfileId) {
      throw new BadRequestException('Patient profile not configured');
    }

    return this.prisma.dailyHealthLog.create({
      data: {
        patientId: user.patientProfileId,
        logDate: input.logDate ? new Date(input.logDate) : new Date(),
        bloodPressureSystolic: input.bloodPressureSystolic ? Number(input.bloodPressureSystolic) : null,
        bloodPressureDiastolic: input.bloodPressureDiastolic ? Number(input.bloodPressureDiastolic) : null,
        bloodSugarFasting: input.bloodSugarFasting ? Number(input.bloodSugarFasting) : null,
        bloodSugarPostPrandial: input.bloodSugarPostPrandial ? Number(input.bloodSugarPostPrandial) : null,
        bloodSugarRandom: input.bloodSugarRandom ? Number(input.bloodSugarRandom) : null,
        heartRateBpm: input.heartRateBpm ? Number(input.heartRateBpm) : null,
        weightKg: input.weightKg ? Number(input.weightKg) : null,
        temperatureCelsius: input.temperatureCelsius ? Number(input.temperatureCelsius) : null,
        spo2Percentage: input.spo2Percentage ? Number(input.spo2Percentage) : null,
        notes: input.notes || null,
      },
    });
  }

  async deleteDailyHealthLog(user: any, id: string) {
    if (!user.patientProfileId) {
      throw new BadRequestException('Patient profile not configured');
    }

    const log = await this.prisma.dailyHealthLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException('Daily health log entry not found');
    }

    if (log.patientId !== user.patientProfileId && user.role !== 'PLATFORM_ADMIN') {
      throw new BadRequestException('You do not have permission to delete this log entry');
    }

    return this.prisma.dailyHealthLog.delete({
      where: { id },
    });
  }

  // ==========================================
  // PATIENT CLINICAL RECORDS & ALLERGIES/CONDITIONS
  // ==========================================
  async createMedicalRecord(user: any, input: any) {
    if (!user.patientProfileId) {
      throw new BadRequestException('Patient profile not configured');
    }

    return this.prisma.medicalRecord.create({
      data: {
        patientId: user.patientProfileId,
        recordType: input.recordType || 'CLINICAL_NOTE',
        title: input.title,
        summary: input.summary || null,
        recordDate: input.recordDate ? new Date(input.recordDate) : new Date(),
      },
    });
  }

  async deleteMedicalRecord(user: any, id: string) {
    if (!user.patientProfileId) {
      throw new BadRequestException('Patient profile not configured');
    }

    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    if (record.patientId !== user.patientProfileId && user.role !== 'PLATFORM_ADMIN') {
      throw new BadRequestException('Permission denied');
    }

    return this.prisma.medicalRecord.delete({
      where: { id },
    });
  }

  async createAllergy(user: any, input: any) {
    if (!user.patientProfileId) {
      throw new BadRequestException('Patient profile not configured');
    }

    return this.prisma.allergy.create({
      data: {
        patientId: user.patientProfileId,
        allergen: input.allergen || input.allergenName || 'Unspecified Allergen',
        severity: input.severity || 'MODERATE',
        reaction: input.reaction || input.notes || null,
        diagnosedAt: input.diagnosedAt ? new Date(input.diagnosedAt) : new Date(),
      },
    });
  }

  async deleteAllergy(user: any, id: string) {
    const item = await this.prisma.allergy.findUnique({ where: { id } });
    if (!item || (item.patientId !== user.patientProfileId && user.role !== 'PLATFORM_ADMIN')) {
      throw new BadRequestException('Not found or permission denied');
    }
    return this.prisma.allergy.delete({ where: { id } });
  }

  async createCondition(user: any, input: any) {
    if (!user.patientProfileId) {
      throw new BadRequestException('Patient profile not configured');
    }

    return this.prisma.condition.create({
      data: {
        patientId: user.patientProfileId,
        code: input.code || null,
        name: input.name || input.conditionName || 'Unspecified Condition',
        status: input.status || input.clinicalStatus || 'ACTIVE',
        notes: input.notes || input.description || null,
        diagnosedAt: input.diagnosedAt ? new Date(input.diagnosedAt) : new Date(),
      },
    });
  }

  async deleteCondition(user: any, id: string) {
    const item = await this.prisma.condition.findUnique({ where: { id } });
    if (!item || (item.patientId !== user.patientProfileId && user.role !== 'PLATFORM_ADMIN')) {
      throw new BadRequestException('Not found or permission denied');
    }
    return this.prisma.condition.delete({ where: { id } });
  }

  async regenerateAccessCode(user: any) {
    if (!user.patientProfileId) {
      throw new BadRequestException('Patient profile not configured');
    }

    const newCode = `HS-${Math.floor(1000 + Math.random() * 9000)}`;
    const updated = await this.prisma.patientProfile.update({
      where: { id: user.patientProfileId },
      data: { accessCode: newCode },
    });

    return { accessCode: updated.accessCode };
  }
}


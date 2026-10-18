import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditActionType, UserRole } from '@healthsync/shared-types';

export interface CreateAuditLogParams {
  actorUserId: string;
  targetPatientId?: string;
  resourceType: string;
  resourceId?: string;
  action: AuditActionType | string;
  isEmergencyOverride?: boolean;
  overrideJustification?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'DENIED';
  denialReason?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logEvent(params: CreateAuditLogParams) {
    try {
      const event = await this.prisma.accessAuditEvent.create({
        data: {
          actorUserId: params.actorUserId,
          targetPatientId: params.targetPatientId,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          action: params.action,
          isEmergencyOverride: params.isEmergencyOverride || false,
          overrideJustification: params.overrideJustification,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          status: params.status || 'SUCCESS',
          denialReason: params.denialReason,
        },
      });

      this.logger.log(
        `AUDIT: Actor=${params.actorUserId} Action=${params.action} Resource=${params.resourceType} Status=${params.status || 'SUCCESS'}`,
      );
      return event;
    } catch (err: any) {
      this.logger.error(`Failed to write audit event: ${err.message}`);
    }
  }

  async getPatientAuditLogs(patientId: string) {
    return this.prisma.accessAuditEvent.findMany({
      where: { targetPatientId: patientId },
      include: {
        actorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  async getAllAuditLogs(limit = 100) {
    return this.prisma.accessAuditEvent.findMany({
      include: {
        actorUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        targetPatient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

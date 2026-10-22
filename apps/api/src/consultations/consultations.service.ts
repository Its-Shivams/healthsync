import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  UserRole,
  ConsultationSessionStatus,
  TimeWindowStatus,
  AppointmentStatus,
  AuditActionType,
} from '@healthsync/shared-types';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private computeWindowStatus(session: any): {
    windowStatus: TimeWindowStatus;
    canJoin: boolean;
    opensInSeconds: number;
    remainingSeconds: number;
  } {
    if (session.status === ConsultationSessionStatus.CANCELLED) {
      return { windowStatus: TimeWindowStatus.CANCELLED, canJoin: false, opensInSeconds: 0, remainingSeconds: 0 };
    }
    if (session.status === ConsultationSessionStatus.COMPLETED) {
      return { windowStatus: TimeWindowStatus.EXPIRED, canJoin: false, opensInSeconds: 0, remainingSeconds: 0 };
    }

    const now = new Date().getTime();
    const startTime = new Date(session.scheduledStartTime).getTime();
    const endTime = new Date(session.scheduledEndTime).getTime();

    // Consultation window: 15 minutes before scheduled start until 30 minutes after scheduled end
    const openTime = startTime - 15 * 60 * 1000;
    const closeTime = endTime + 30 * 60 * 1000;

    if (now < openTime) {
      const opensInSeconds = Math.max(1, Math.ceil((openTime - now) / 1000));
      return { windowStatus: TimeWindowStatus.BEFORE_WINDOW, canJoin: false, opensInSeconds, remainingSeconds: 0 };
    }

    if (now > closeTime) {
      return { windowStatus: TimeWindowStatus.EXPIRED, canJoin: false, opensInSeconds: 0, remainingSeconds: 0 };
    }

    const remainingSeconds = Math.max(0, Math.ceil((closeTime - now) / 1000));
    return { windowStatus: TimeWindowStatus.WINDOW_OPEN, canJoin: true, opensInSeconds: 0, remainingSeconds };
  }

  private async getAuthorizedSession(user: any, sessionOrAppointmentId: string) {
    let session = await this.prisma.consultationSession.findFirst({
      where: {
        OR: [{ id: sessionOrAppointmentId }, { appointmentId: sessionOrAppointmentId }],
      },
      include: {
        appointment: {
          include: {
            patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } } },
            slot: {
              include: {
                doctor: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
                    specialties: true,
                  },
                },
                facility: { select: { id: true, name: true, city: true } },
              },
            },
          },
        },
      },
    });

    // If session doesn't exist yet but confirmed appointment exists, create session
    if (!session) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: sessionOrAppointmentId },
        include: {
          slot: {
            include: {
              doctor: { include: { user: true, specialties: true } },
              facility: true,
            },
          },
          patient: { include: { user: true } },
        },
      });

      if (!appointment) {
        throw new NotFoundException('Consultation session or appointment not found');
      }

      const roomName = `room-${appointment.bookingReference.toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
      session = await this.prisma.consultationSession.create({
        data: {
          appointmentId: appointment.id,
          roomName,
          status:
            appointment.status === AppointmentStatus.COMPLETED
              ? ConsultationSessionStatus.COMPLETED
              : appointment.status === AppointmentStatus.CANCELLED
              ? ConsultationSessionStatus.CANCELLED
              : ConsultationSessionStatus.SCHEDULED,
          scheduledStartTime: appointment.slot.startTime,
          scheduledEndTime: appointment.slot.endTime,
        },
        include: {
          appointment: {
            include: {
              patient: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } } },
              slot: {
                include: {
                  doctor: {
                    include: {
                      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
                      specialties: true,
                    },
                  },
                  facility: { select: { id: true, name: true, city: true } },
                },
              },
            },
          },
        },
      });
    }

    // RBAC Authorization Check
    const patientUserId = session.appointment.patient.user.id;
    const doctorUserId = session.appointment.slot.doctor.user.id;
    const isDoctor = user.role === UserRole.DOCTOR && (user.id === doctorUserId || user.doctorProfileId === session.appointment.slot.doctorId);
    const isPatient = user.role === UserRole.PATIENT && (user.id === patientUserId || user.patientProfileId === session.appointment.patientId);
    const isAdmin = user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.HOSPITAL_ADMIN;

    if (!isDoctor && !isPatient && !isAdmin) {
      throw new ForbiddenException('You are not authorized to access this clinical consultation room');
    }

    return { session, isDoctor, isPatient, isAdmin };
  }

  async getSessionDetails(user: any, sessionOrAppointmentId: string) {
    const { session, isDoctor, isPatient } = await this.getAuthorizedSession(user, sessionOrAppointmentId);
    const windowInfo = this.computeWindowStatus(session);

    return {
      ...session,
      ...windowInfo,
      currentUserRole: isDoctor ? 'DOCTOR' : isPatient ? 'PATIENT' : 'ADMIN',
    };
  }

  async joinSession(user: any, sessionId: string) {
    const { session, isDoctor, isPatient } = await this.getAuthorizedSession(user, sessionId);
    const windowInfo = this.computeWindowStatus(session);

    if (!windowInfo.canJoin) {
      if (windowInfo.windowStatus === TimeWindowStatus.BEFORE_WINDOW) {
        throw new ForbiddenException(`Consultation room opens in ${windowInfo.opensInSeconds} seconds (15 minutes prior to appointment start time).`);
      }
      throw new ForbiddenException(`Consultation session cannot be joined. Status: ${windowInfo.windowStatus}`);
    }

    const now = new Date();
    const updateData: any = {};

    if (isDoctor && !session.doctorJoinedAt) {
      updateData.doctorJoinedAt = now;
    }
    if (isPatient && !session.patientJoinedAt) {
      updateData.patientJoinedAt = now;
    }

    if (session.status === ConsultationSessionStatus.SCHEDULED) {
      updateData.status = ConsultationSessionStatus.IN_PROGRESS;
      if (!session.actualStartTime) {
        updateData.actualStartTime = now;
      }
    }

    const updated = await this.prisma.consultationSession.update({
      where: { id: session.id },
      data: updateData,
    });

    await this.audit.logEvent({
      actorUserId: user.id,
      targetPatientId: session.appointment.patientId,
      resourceType: 'CONSULTATION_SESSION',
      resourceId: session.id,
      action: AuditActionType.RECORD_VIEW,
      status: 'SUCCESS',
    });

    return {
      ...updated,
      ...windowInfo,
    };
  }

  async endSession(user: any, sessionId: string) {
    const { session } = await this.getAuthorizedSession(user, sessionId);

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const sess = await tx.consultationSession.update({
        where: { id: session.id },
        data: {
          status: ConsultationSessionStatus.COMPLETED,
          actualEndTime: now,
        },
      });

      await tx.appointment.update({
        where: { id: session.appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
        },
      });

      return sess;
    });

    return updated;
  }

  async getMessages(user: any, sessionId: string) {
    const { session } = await this.getAuthorizedSession(user, sessionId);

    return this.prisma.consultationMessage.findMany({
      where: { sessionId: session.id },
      include: {
        sharedDocument: {
          select: {
            id: true,
            title: true,
            category: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            storageKey: true,
            sha256Hash: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(user: any, sessionId: string, content: string, sharedDocumentId?: string) {
    const { session, isDoctor, isPatient } = await this.getAuthorizedSession(user, sessionId);
    const windowInfo = this.computeWindowStatus(session);

    if (!windowInfo.canJoin) {
      throw new ForbiddenException('Chat messaging is only active during the scheduled consultation window');
    }

    if (!content && !sharedDocumentId) {
      throw new BadRequestException('Message must contain text content or an attached medical document');
    }

    // Document sharing consent verification
    if (sharedDocumentId) {
      const doc = await this.prisma.medicalDocument.findUnique({
        where: { id: sharedDocumentId },
      });
      if (!doc || doc.patientId !== session.appointment.patientId) {
        throw new ForbiddenException('You can only attach verified medical documents belonging to this patient');
      }
    }

    const senderRole = isDoctor ? 'DOCTOR' : isPatient ? 'PATIENT' : 'ADMIN';
    const senderName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    return this.prisma.consultationMessage.create({
      data: {
        sessionId: session.id,
        senderId: user.id,
        senderRole,
        senderName,
        content: content || 'Shared a medical record',
        sharedDocumentId: sharedDocumentId || null,
      },
      include: {
        sharedDocument: {
          select: {
            id: true,
            title: true,
            category: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            storageKey: true,
            sha256Hash: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async sendSignal(user: any, sessionId: string, type: string, data: any) {
    const { session } = await this.getAuthorizedSession(user, sessionId);
    const windowInfo = this.computeWindowStatus(session);

    if (!windowInfo.canJoin) {
      throw new ForbiddenException('WebRTC signaling is only permitted during an active consultation window');
    }

    return this.prisma.consultationSignal.create({
      data: {
        sessionId: session.id,
        senderId: user.id,
        type,
        data: typeof data === 'string' ? data : JSON.stringify(data),
      },
    });
  }

  async getSignals(user: any, sessionId: string, since?: string) {
    const { session } = await this.getAuthorizedSession(user, sessionId);

    const whereClause: any = {
      sessionId: session.id,
      senderId: { not: user.id }, // Retrieve signals from the peer only
    };

    if (since) {
      whereClause.createdAt = { gt: new Date(since) };
    }

    return this.prisma.consultationSignal.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPatientDocuments(user: any, sessionOrAppointmentId: string) {
    const { session } = await this.getAuthorizedSession(user, sessionOrAppointmentId);

    return this.prisma.medicalDocument.findMany({
      where: { patientId: session.appointment.patientId },
      select: {
        id: true,
        title: true,
        category: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        storageKey: true,
        sha256Hash: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

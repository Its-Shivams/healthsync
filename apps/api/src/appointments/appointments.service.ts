import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, AppointmentStatus, AuditActionType, ConsultationSessionStatus } from '@healthsync/shared-types';
import { AppointmentBookingInput } from '@healthsync/validation';
import { DoctorAvailabilityService } from './doctor-availability.service';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly doctorAvailabilityService: DoctorAvailabilityService,
  ) {}

  private async ensureFutureSlots(targetDoctorId?: string) {
    try {
      if (targetDoctorId) {
        await this.doctorAvailabilityService.generateSlotsForSchedule(targetDoctorId);
      } else {
        const doctorsWithSchedules = await this.prisma.doctorAvailability.findMany({
          where: { isActive: true },
          select: { doctorId: true },
          distinct: ['doctorId'],
        });
        for (const doc of doctorsWithSchedules) {
          await this.doctorAvailabilityService.generateSlotsForSchedule(doc.doctorId);
        }
      }

      const futureCount = await this.prisma.appointmentSlot.count({
        where: {
          startTime: { gt: new Date() },
          isBooked: false,
        },
      });

      if (futureCount >= 8) return;

      const doctors = await this.prisma.doctorProfile.findMany({
        include: { user: true },
      });
      const facilities = await this.prisma.healthcareFacility.findMany();

      if (doctors.length === 0 || facilities.length === 0) return;

      const defaultFacility = facilities[0];
      const now = new Date();

      for (const doc of doctors) {
        for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
          const slotDate = new Date(now);
          slotDate.setDate(now.getDate() + dayOffset);

          const hours = [10, 11, 14, 16, 17];
          for (const h of hours) {
            const startTime = new Date(slotDate);
            startTime.setHours(h, 0, 0, 0);
            const endTime = new Date(slotDate);
            endTime.setHours(h, 45, 0, 0);

            const existing = await this.prisma.appointmentSlot.findFirst({
              where: {
                doctorId: doc.id,
                startTime,
              },
            });

            if (!existing) {
              await this.prisma.appointmentSlot.create({
                data: {
                  doctorId: doc.id,
                  facilityId: defaultFacility.id,
                  startTime,
                  endTime,
                  isBooked: false,
                },
              });
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to auto-seed slots: ${err.message}`);
    }
  }

  async listSlots(doctorId?: string, facilityId?: string) {
    await this.ensureFutureSlots(doctorId);

    const rawSlots = await this.prisma.appointmentSlot.findMany({
      where: {
        doctorId: doctorId || undefined,
        facilityId: facilityId || undefined,
        startTime: { gt: new Date() },
      },
      include: {
        doctor: {
          include: {
            user: { select: { firstName: true, lastName: true, avatarUrl: true } },
            specialties: true,
          },
        },
        facility: {
          select: { name: true, address: true, city: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Check exceptions and daily capacity limits to filter/annotate slots
    const validSlots: typeof rawSlots = [];
    for (const slot of rawSlots) {
      const normalizedDate = new Date(
        slot.startTime.getFullYear(),
        slot.startTime.getMonth(),
        slot.startTime.getDate(),
        0, 0, 0, 0
      );

      const exception = await this.prisma.doctorAvailabilityException.findUnique({
        where: {
          doctorId_date: {
            doctorId: slot.doctorId,
            date: normalizedDate,
          },
        },
      });

      // If doctor is marked unavailable / leave on this date, omit unbooked slots
      if (exception && !exception.isAvailable && !slot.isBooked) {
        continue;
      }

      // Check daily patient capacity limit
      const dayOfWeek = slot.startTime.getDay();
      const availability = await this.prisma.doctorAvailability.findFirst({
        where: {
          doctorId: slot.doctorId,
          dayOfWeek,
          isActive: true,
        },
      });

      if (availability?.maxDailyPatients && !slot.isBooked) {
        const startOfDay = new Date(normalizedDate);
        const endOfDay = new Date(normalizedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const bookedTodayCount = await this.prisma.appointment.count({
          where: {
            slot: {
              doctorId: slot.doctorId,
              startTime: { gte: startOfDay, lte: endOfDay },
            },
            status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
          },
        });

        if (bookedTodayCount >= availability.maxDailyPatients) {
          // Daily limit reached for this doctor on this day
          continue;
        }
      }

      validSlots.push(slot);
    }

    return validSlots;
  }

  async createSlots(user: any, doctorId: string, facilityId: string, startTimes: string[], durationMinutes = 30) {
    if (user.role !== UserRole.DOCTOR && user.role !== UserRole.HOSPITAL_ADMIN) {
      throw new ForbiddenException('Only doctors or facility administrators can create appointment slots');
    }

    const createdSlots: any[] = [];
    for (const timeStr of startTimes) {
      const startTime = new Date(timeStr);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

      const slot = await this.prisma.appointmentSlot.create({
        data: {
          doctorId,
          facilityId,
          startTime,
          endTime,
          isBooked: false,
        },
      });
      createdSlots.push(slot);
    }

    return createdSlots;
  }

  // ATOMIC DATABASE TRANSACTION TO STRICTLY PREVENT DOUBLE BOOKING
  async bookAppointment(user: any, input: AppointmentBookingInput) {
    if (user.role !== UserRole.PATIENT || !user.patientProfileId) {
      throw new ForbiddenException('Only registered patients can book clinical appointments');
    }

    const bookingRef = `HS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch slot with locking/verification
      const slot = await tx.appointmentSlot.findUnique({
        where: { id: input.slotId },
        include: {
          doctor: { include: { user: true } },
          facility: true,
        },
      });

      if (!slot) {
        throw new NotFoundException('Selected appointment slot not found');
      }

      if (slot.isBooked) {
        throw new ConflictException(
          'CONCURRENCY_CONFLICT: This appointment slot was just booked by another patient. Please select another slot.',
        );
      }

      if (slot.startTime <= new Date()) {
        throw new BadRequestException('Cannot book appointment slots in the past');
      }

      // Check date leave/exception for the doctor
      const normalizedDate = new Date(
        slot.startTime.getFullYear(),
        slot.startTime.getMonth(),
        slot.startTime.getDate(),
        0, 0, 0, 0
      );

      const exception = await tx.doctorAvailabilityException.findUnique({
        where: {
          doctorId_date: {
            doctorId: slot.doctorId,
            date: normalizedDate,
          },
        },
      });

      if (exception && !exception.isAvailable) {
        throw new BadRequestException('Doctor is on leave or unavailable on the requested date');
      }

      // Check daily capacity limit
      const dayOfWeek = slot.startTime.getDay();
      const availability = await tx.doctorAvailability.findFirst({
        where: {
          doctorId: slot.doctorId,
          dayOfWeek,
          isActive: true,
        },
      });

      if (availability?.maxDailyPatients) {
        const startOfDay = new Date(normalizedDate);
        const endOfDay = new Date(normalizedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const currentBookings = await tx.appointment.count({
          where: {
            slot: {
              doctorId: slot.doctorId,
              startTime: { gte: startOfDay, lte: endOfDay },
            },
            status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
          },
        });

        if (currentBookings >= availability.maxDailyPatients) {
          throw new ConflictException(
            `Doctor has reached maximum daily capacity (${availability.maxDailyPatients} patients) for this date`,
          );
        }
      }

      // 2. Mark slot as booked
      await tx.appointmentSlot.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });

      // 3. Create appointment record
      const appointment = await tx.appointment.create({
        data: {
          patientId: user.patientProfileId,
          slotId: slot.id,
          status: AppointmentStatus.CONFIRMED,
          reasonForVisit: input.reasonForVisit,
          bookingReference: bookingRef,
        },
        include: {
          slot: {
            include: {
              doctor: {
                include: {
                  user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
                  specialties: true,
                },
              },
              facility: true,
            },
          },
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
            },
          },
        },
      });

      // 4. Create ConsultationSession for this confirmed appointment
      const roomName = `room-${bookingRef.toLowerCase()}-${Math.random().toString(36).substring(2, 7)}`;
      await tx.consultationSession.create({
        data: {
          appointmentId: appointment.id,
          roomName,
          status: ConsultationSessionStatus.SCHEDULED,
          scheduledStartTime: slot.startTime,
          scheduledEndTime: slot.endTime,
        },
      });

      // 5. Record audit event
      await tx.accessAuditEvent.create({
        data: {
          actorUserId: user.id,
          targetPatientId: user.patientProfileId,
          resourceType: 'APPOINTMENT',
          resourceId: appointment.id,
          action: AuditActionType.APPOINTMENT_BOOK,
          status: 'SUCCESS',
        },
      });

      // 6. Notify Doctor
      await tx.notification.create({
        data: {
          userId: slot.doctor.userId,
          title: 'New Appointment Booked',
          message: `Patient ${user.firstName} ${user.lastName} has booked an appointment for ${slot.startTime.toLocaleString()} (Ref: ${bookingRef}).`,
          type: 'APPOINTMENT_UPDATE',
        },
      });

      return appointment;
    });
  }

  async getMyAppointments(user: any) {
    if (user.role === UserRole.PATIENT && user.patientProfileId) {
      return this.prisma.appointment.findMany({
        where: { patientId: user.patientProfileId },
        include: {
          slot: {
            include: {
              doctor: {
                include: {
                  user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
                  specialties: true,
                },
              },
              facility: true,
            },
          },
          consultationSession: true,
        },
        orderBy: { slot: { startTime: 'desc' } },
      });
    }

    if (user.role === UserRole.DOCTOR && user.doctorProfileId) {
      return this.prisma.appointment.findMany({
        where: {
          slot: { doctorId: user.doctorProfileId },
        },
        include: {
          slot: {
            include: {
              doctor: {
                include: {
                  user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
                  specialties: true,
                },
              },
              facility: true,
            },
          },
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
            },
          },
          consultationSession: true,
        },
        orderBy: { slot: { startTime: 'asc' } },
      });
    }

    if (user.role === UserRole.HOSPITAL_ADMIN || user.role === UserRole.PLATFORM_ADMIN) {
      const memberships = await this.prisma.organizationMembership.findMany({
        where: { userId: user.id },
      });
      const orgIds = memberships.map((m) => m.organizationId);

      const whereClause: any = {};
      if (orgIds.length > 0 && user.role !== UserRole.PLATFORM_ADMIN) {
        whereClause.slot = { facility: { organizationId: { in: orgIds } } };
      }

      return this.prisma.appointment.findMany({
        where: whereClause,
        include: {
          slot: {
            include: {
              doctor: {
                include: {
                  user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
                  specialties: true,
                },
              },
              facility: true,
            },
          },
          patient: {
            include: {
              user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
            },
          },
          consultationSession: true,
        },
        orderBy: { slot: { startTime: 'desc' } },
      });
    }

    return [];
  }

  async updateStatus(user: any, appointmentId: string, status: AppointmentStatus, notes?: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true },
    });

    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status,
          notes: notes || appt.notes,
        },
        include: {
          slot: true,
          patient: { include: { user: true } },
          consultationSession: true,
        },
      });

      // If cancelled or rejected, free the slot and update consultation session
      if (status === AppointmentStatus.CANCELLED || status === AppointmentStatus.REJECTED) {
        await tx.appointmentSlot.update({
          where: { id: appt.slotId },
          data: { isBooked: false },
        });

        await tx.consultationSession.updateMany({
          where: { appointmentId },
          data: { status: ConsultationSessionStatus.CANCELLED },
        });
      } else if (status === AppointmentStatus.COMPLETED) {
        await tx.consultationSession.updateMany({
          where: { appointmentId },
          data: {
            status: ConsultationSessionStatus.COMPLETED,
            actualEndTime: new Date(),
          },
        });
      }

      return updated;
    });
  }
}

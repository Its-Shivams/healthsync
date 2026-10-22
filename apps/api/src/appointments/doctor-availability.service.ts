import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, AppointmentStatus } from '@healthsync/shared-types';

export interface SetAvailabilityInput {
  facilityId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  slotDurationMinutes?: number;
  maxDailyPatients?: number;
  breakStartTime?: string;
  breakEndTime?: string;
  isActive?: boolean;
}

export interface SetExceptionInput {
  date: string; // "YYYY-MM-DD"
  isAvailable: boolean;
  reason?: string;
  customStartTime?: string;
  customEndTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  forceIfConflicts?: boolean;
}

@Injectable()
export class DoctorAvailabilityService {
  private readonly logger = new Logger(DoctorAvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  private parseTimeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    return h * 60 + m;
  }

  private minutesToTimeStr(totalMinutes: number): string {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  async getDoctorProfile(user: any) {
    if (user.role !== UserRole.DOCTOR || !user.doctorProfileId) {
      throw new ForbiddenException('Only verified doctors can manage clinical availability');
    }
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: user.doctorProfileId },
      include: { affiliations: { include: { facility: true } } },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    return doctor;
  }

  async getMyAvailability(user: any) {
    const doctor = await this.getDoctorProfile(user);

    const [availabilities, exceptions, facilities] = await Promise.all([
      this.prisma.doctorAvailability.findMany({
        where: { doctorId: doctor.id },
        include: { facility: { select: { id: true, name: true, city: true } } },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.doctorAvailabilityException.findMany({
        where: {
          doctorId: doctor.id,
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.healthcareFacility.findMany({
        select: { id: true, name: true, city: true },
      }),
    ]);

    return {
      availabilities,
      exceptions,
      facilities,
    };
  }

  async setAvailability(user: any, input: SetAvailabilityInput) {
    const doctor = await this.getDoctorProfile(user);

    // Validate day of week
    if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
      throw new BadRequestException('Day of week must be between 0 (Sunday) and 6 (Saturday)');
    }

    // Validate times
    const startM = this.parseTimeToMinutes(input.startTime);
    const endM = this.parseTimeToMinutes(input.endTime);
    if (endM <= startM) {
      throw new BadRequestException('End time must be later than start time');
    }

    const duration = input.slotDurationMinutes || 30;
    if (duration < 10 || duration > 120) {
      throw new BadRequestException('Slot duration must be between 10 and 120 minutes');
    }

    if (input.breakStartTime && input.breakEndTime) {
      const bStartM = this.parseTimeToMinutes(input.breakStartTime);
      const bEndM = this.parseTimeToMinutes(input.breakEndTime);
      if (bEndM <= bStartM) {
        throw new BadRequestException('Break end time must be after break start time');
      }
      if (bStartM < startM || bEndM > endM) {
        throw new BadRequestException('Break time must fall within working hours');
      }
    }

    // Verify facility exists
    const facility = await this.prisma.healthcareFacility.findUnique({
      where: { id: input.facilityId },
    });
    if (!facility) {
      throw new NotFoundException('Healthcare facility not found');
    }

    const availability = await this.prisma.doctorAvailability.upsert({
      where: {
        doctorId_facilityId_dayOfWeek: {
          doctorId: doctor.id,
          facilityId: input.facilityId,
          dayOfWeek: input.dayOfWeek,
        },
      },
      create: {
        doctorId: doctor.id,
        facilityId: input.facilityId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMinutes: duration,
        maxDailyPatients: input.maxDailyPatients || 15,
        breakStartTime: input.breakStartTime || null,
        breakEndTime: input.breakEndTime || null,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
      update: {
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMinutes: duration,
        maxDailyPatients: input.maxDailyPatients || 15,
        breakStartTime: input.breakStartTime || null,
        breakEndTime: input.breakEndTime || null,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
      include: {
        facility: { select: { id: true, name: true, city: true } },
      },
    });

    // Auto-generate future slots for this schedule
    await this.generateSlotsForSchedule(doctor.id, availability.id);

    return availability;
  }

  async deleteAvailability(user: any, id: string) {
    const doctor = await this.getDoctorProfile(user);

    const existing = await this.prisma.doctorAvailability.findUnique({
      where: { id },
    });
    if (!existing || existing.doctorId !== doctor.id) {
      throw new NotFoundException('Availability schedule not found or unauthorized');
    }

    await this.prisma.doctorAvailability.delete({
      where: { id },
    });

    return { success: true, message: 'Availability schedule removed' };
  }

  async setException(user: any, input: SetExceptionInput) {
    const doctor = await this.getDoctorProfile(user);

    const parsedDate = new Date(input.date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid exception date format');
    }
    const normalizedDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0, 0);

    // Check if doctor has confirmed appointments on this date
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictingAppts = await this.prisma.appointment.findMany({
      where: {
        slot: {
          doctorId: doctor.id,
          startTime: { gte: startOfDay, lte: endOfDay },
        },
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        slot: true,
        patient: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!input.isAvailable && conflictingAppts.length > 0 && !input.forceIfConflicts) {
      return {
        hasConflict: true,
        conflictCount: conflictingAppts.length,
        conflictingAppointments: conflictingAppts.map((a) => ({
          id: a.id,
          reference: a.bookingReference,
          patientName: `${a.patient.user.firstName} ${a.patient.user.lastName}`,
          time: a.slot.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })),
        message: `You have ${conflictingAppts.length} confirmed appointment(s) on this date. Please resolve or reschedule them first, or pass forceIfConflicts: true to keep existing bookings while blocking new slots.`,
      };
    }

    const exception = await this.prisma.doctorAvailabilityException.upsert({
      where: {
        doctorId_date: {
          doctorId: doctor.id,
          date: normalizedDate,
        },
      },
      create: {
        doctorId: doctor.id,
        date: normalizedDate,
        isAvailable: input.isAvailable,
        reason: input.reason || null,
        customStartTime: input.customStartTime || null,
        customEndTime: input.customEndTime || null,
        breakStartTime: input.breakStartTime || null,
        breakEndTime: input.breakEndTime || null,
      },
      update: {
        isAvailable: input.isAvailable,
        reason: input.reason || null,
        customStartTime: input.customStartTime || null,
        customEndTime: input.customEndTime || null,
        breakStartTime: input.breakStartTime || null,
        breakEndTime: input.breakEndTime || null,
      },
    });

    return {
      hasConflict: false,
      exception,
      message: input.isAvailable
        ? 'Custom working hours saved for date'
        : 'Leave / unavailable date recorded successfully',
    };
  }

  async deleteException(user: any, id: string) {
    const doctor = await this.getDoctorProfile(user);

    const existing = await this.prisma.doctorAvailabilityException.findUnique({
      where: { id },
    });
    if (!existing || existing.doctorId !== doctor.id) {
      throw new NotFoundException('Availability exception not found or unauthorized');
    }

    await this.prisma.doctorAvailabilityException.delete({
      where: { id },
    });

    return { success: true, message: 'Availability exception removed' };
  }

  async generateSlotsForSchedule(doctorId: string, availabilityId?: string, daysAhead = 14) {
    const schedules = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId,
        id: availabilityId || undefined,
        isActive: true,
      },
      include: { facility: true },
    });

    if (schedules.length === 0) return { count: 0 };

    const now = new Date();
    const createdSlotsCount = { count: 0 };

    for (let i = 0; i < daysAhead; i++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + i);
      const dayOfWeek = targetDate.getDay();
      const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

      // Check date exception
      const exception = await this.prisma.doctorAvailabilityException.findUnique({
        where: {
          doctorId_date: {
            doctorId,
            date: normalizedDate,
          },
        },
      });

      if (exception && !exception.isAvailable) {
        // Doctor is on leave/holiday on this date
        continue;
      }

      for (const schedule of schedules) {
        if (schedule.dayOfWeek !== dayOfWeek && (!exception || !exception.isAvailable)) {
          continue;
        }

        const startStr = exception?.customStartTime || schedule.startTime;
        const endStr = exception?.customEndTime || schedule.endTime;
        const bStartStr = exception?.breakStartTime || schedule.breakStartTime;
        const bEndStr = exception?.breakEndTime || schedule.breakEndTime;
        const duration = schedule.slotDurationMinutes || 30;

        const startM = this.parseTimeToMinutes(startStr);
        const endM = this.parseTimeToMinutes(endStr);
        const bStartM = bStartStr ? this.parseTimeToMinutes(bStartStr) : null;
        const bEndM = bEndStr ? this.parseTimeToMinutes(bEndStr) : null;

        let currentSlotM = startM;
        let dailySlotCount = 0;

        while (currentSlotM + duration <= endM && dailySlotCount < schedule.maxDailyPatients) {
          const slotEndM = currentSlotM + duration;

          // Skip break time overlap
          if (bStartM !== null && bEndM !== null) {
            if (!(slotEndM <= bStartM || currentSlotM >= bEndM)) {
              currentSlotM += duration;
              continue;
            }
          }

          const slotStart = new Date(targetDate);
          slotStart.setHours(Math.floor(currentSlotM / 60), currentSlotM % 60, 0, 0);

          const slotEnd = new Date(targetDate);
          slotEnd.setHours(Math.floor(slotEndM / 60), slotEndM % 60, 0, 0);

          // Do not generate in the past
          if (slotStart > now) {
            const existing = await this.prisma.appointmentSlot.findFirst({
              where: {
                doctorId,
                startTime: slotStart,
              },
            });

            if (!existing) {
              await this.prisma.appointmentSlot.create({
                data: {
                  doctorId,
                  facilityId: schedule.facilityId,
                  startTime: slotStart,
                  endTime: slotEnd,
                  isBooked: false,
                },
              });
              createdSlotsCount.count++;
            }
            dailySlotCount++;
          }

          currentSlotM += duration;
        }
      }
    }

    return createdSlotsCount;
  }
}

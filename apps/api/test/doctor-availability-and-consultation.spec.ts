import { DoctorAvailabilityService } from '../src/appointments/doctor-availability.service';
import { AppointmentsService } from '../src/appointments/appointments.service';
import { ConsultationsService } from '../src/consultations/consultations.service';
import {
  UserRole,
  AppointmentStatus,
  ConsultationSessionStatus,
  TimeWindowStatus,
} from '@healthsync/shared-types';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('Doctor Availability, Slot Generation & LiveCare Consultation Engine', () => {
  let mockPrisma: any;
  let mockAudit: any;
  let doctorAvailabilityService: DoctorAvailabilityService;
  let appointmentsService: AppointmentsService;
  let consultationsService: ConsultationsService;

  const mockDoctorUser = {
    id: 'user-doc-1',
    role: UserRole.DOCTOR,
    doctorProfileId: 'doc-profile-1',
    firstName: 'Arun',
    lastName: 'Sharma',
  };

  const mockPatientUser = {
    id: 'user-pat-1',
    role: UserRole.PATIENT,
    patientProfileId: 'pat-profile-1',
    firstName: 'Neha',
    lastName: 'Gupta',
  };

  beforeEach(() => {
    mockPrisma = {
      doctorProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      healthcareFacility: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      doctorAvailability: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      doctorAvailabilityException: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      appointmentSlot: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      consultationSession: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      consultationMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      consultationSignal: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      medicalDocument: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      accessAuditEvent: { create: jest.fn() },
      notification: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockAudit = {
      logEvent: jest.fn().mockResolvedValue(true),
    };

    doctorAvailabilityService = new DoctorAvailabilityService(mockPrisma as any);
    appointmentsService = new AppointmentsService(mockPrisma as any, mockAudit as any, doctorAvailabilityService);
    consultationsService = new ConsultationsService(mockPrisma as any, mockAudit as any);
  });

  describe('1. Doctor Availability Configuration & Validation', () => {
    it('should save doctor weekly schedule with working hours and breaks', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-profile-1' });
      mockPrisma.healthcareFacility.findUnique.mockResolvedValue({ id: 'fac-1', name: 'Apollo Health' });
      mockPrisma.doctorAvailability.upsert.mockResolvedValue({
        id: 'avail-1',
        doctorId: 'doc-profile-1',
        facilityId: 'fac-1',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        maxDailyPatients: 10,
        breakStartTime: '13:00',
        breakEndTime: '14:00',
      });
      mockPrisma.doctorAvailability.findMany.mockResolvedValue([]);

      const result = await doctorAvailabilityService.setAvailability(mockDoctorUser, {
        facilityId: 'fac-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        maxDailyPatients: 10,
        breakStartTime: '13:00',
        breakEndTime: '14:00',
      });

      expect(result.id).toBe('avail-1');
      expect(mockPrisma.doctorAvailability.upsert).toHaveBeenCalled();
    });

    it('should reject schedule when end time is earlier than or equal to start time', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-profile-1' });

      await expect(
        doctorAvailabilityService.setAvailability(mockDoctorUser, {
          facilityId: 'fac-1',
          dayOfWeek: 1,
          startTime: '17:00',
          endTime: '09:00', // Invalid
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject schedule when break time falls outside working hours', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-profile-1' });

      await expect(
        doctorAvailabilityService.setAvailability(mockDoctorUser, {
          facilityId: 'fac-1',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '13:00',
          breakStartTime: '14:00', // Outside
          breakEndTime: '15:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should forbid non-doctors from configuring doctor availability', async () => {
      await expect(
        doctorAvailabilityService.setAvailability(mockPatientUser, {
          facilityId: 'fac-1',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('2. Date Leave Exceptions & Confirmed Booking Conflict Protection', () => {
    it('should alert the doctor when setting leave on a date with confirmed appointments', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-profile-1' });
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          bookingReference: 'HS-2026-999888',
          status: AppointmentStatus.CONFIRMED,
          slot: { startTime: new Date('2026-11-10T10:00:00Z') },
          patient: { user: { firstName: 'Rahul', lastName: 'Kumar' } },
        },
      ]);

      const result = await doctorAvailabilityService.setException(mockDoctorUser, {
        date: '2026-11-10',
        isAvailable: false,
        reason: 'Emergency Medical Leave',
        forceIfConflicts: false,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.conflictingAppointments[0].reference).toBe('HS-2026-999888');
      expect(mockPrisma.doctorAvailabilityException.upsert).not.toHaveBeenCalled();
    });

    it('should record leave if forceIfConflicts is true without deleting confirmed appointments', async () => {
      mockPrisma.doctorProfile.findUnique.mockResolvedValue({ id: 'doc-profile-1' });
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          bookingReference: 'HS-2026-999888',
          status: AppointmentStatus.CONFIRMED,
          slot: { startTime: new Date('2026-11-10T10:00:00Z') },
          patient: { user: { firstName: 'Rahul', lastName: 'Kumar' } },
        },
      ]);
      mockPrisma.doctorAvailabilityException.upsert.mockResolvedValue({
        id: 'exc-1',
        isAvailable: false,
      });

      const result = await doctorAvailabilityService.setException(mockDoctorUser, {
        date: '2026-11-10',
        isAvailable: false,
        reason: 'Emergency Medical Leave',
        forceIfConflicts: true, // Force save
      });

      expect(result.hasConflict).toBe(false);
      expect(mockPrisma.doctorAvailabilityException.upsert).toHaveBeenCalled();
    });
  });

  describe('3. Booking Validation, Daily Capacity Limits & Atomic Prevention', () => {
    it('should prevent booking on a doctor leave date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      mockPrisma.appointmentSlot.findUnique.mockResolvedValue({
        id: 'slot-1',
        doctorId: 'doc-profile-1',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60000),
        isBooked: false,
        doctor: { userId: 'user-doc-1' },
      });

      // Doctor is on leave on this date
      mockPrisma.doctorAvailabilityException.findUnique.mockResolvedValue({
        isAvailable: false,
        reason: 'Conference',
      });

      await expect(
        appointmentsService.bookAppointment(mockPatientUser, {
          slotId: 'slot-1',
          doctorId: 'doc-profile-1',
          facilityId: 'fac-1',
          reasonForVisit: 'Routine Checkup',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent booking when doctor reaches daily patient capacity limit', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      mockPrisma.appointmentSlot.findUnique.mockResolvedValue({
        id: 'slot-2',
        doctorId: 'doc-profile-1',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60000),
        isBooked: false,
        doctor: { userId: 'user-doc-1' },
      });

      mockPrisma.doctorAvailabilityException.findUnique.mockResolvedValue(null);
      mockPrisma.doctorAvailability.findFirst.mockResolvedValue({
        maxDailyPatients: 3, // Capacity limit is 3
        isActive: true,
      });

      // Doctor already has 3 confirmed bookings for today
      mockPrisma.appointment.count.mockResolvedValue(3);

      await expect(
        appointmentsService.bookAppointment(mockPatientUser, {
          slotId: 'slot-2',
          doctorId: 'doc-profile-1',
          facilityId: 'fac-1',
          reasonForVisit: 'Health Check',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent booking an already booked slot (atomic concurrency conflict)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      mockPrisma.appointmentSlot.findUnique.mockResolvedValue({
        id: 'slot-3',
        isBooked: true, // Concurrently booked by another patient
        startTime: futureDate,
      });

      await expect(
        appointmentsService.bookAppointment(mockPatientUser, {
          slotId: 'slot-3',
          doctorId: 'doc-profile-1',
          facilityId: 'fac-1',
          reasonForVisit: 'Consultation',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should automatically generate a ConsultationSession upon confirmed appointment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      mockPrisma.appointmentSlot.findUnique.mockResolvedValue({
        id: 'slot-4',
        doctorId: 'doc-profile-1',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 30 * 60000),
        isBooked: false,
        doctor: { userId: 'user-doc-1' },
      });
      mockPrisma.doctorAvailabilityException.findUnique.mockResolvedValue(null);
      mockPrisma.doctorAvailability.findFirst.mockResolvedValue({ maxDailyPatients: 10 });
      mockPrisma.appointment.count.mockResolvedValue(1);

      mockPrisma.appointmentSlot.update.mockResolvedValue({ id: 'slot-4', isBooked: true });
      mockPrisma.appointment.create.mockResolvedValue({
        id: 'appt-created',
        bookingReference: 'HS-2026-112233',
        status: AppointmentStatus.CONFIRMED,
        slot: { startTime: futureDate, endTime: new Date(futureDate.getTime() + 30 * 60000) },
      });

      await appointmentsService.bookAppointment(mockPatientUser, {
        slotId: 'slot-4',
        doctorId: 'doc-profile-1',
        facilityId: 'fac-1',
        reasonForVisit: 'Cardiology Review',
      });

      expect(mockPrisma.consultationSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            appointmentId: 'appt-created',
            status: ConsultationSessionStatus.SCHEDULED,
          }),
        }),
      );
    });
  });

  describe('4. LiveCare Consultation Time Window & WebRTC Access Enforcement', () => {
    it('should identify BEFORE_WINDOW when accessed more than 15 minutes early and deny joining', async () => {
      const farFuture = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes in future
      const farFutureEnd = new Date(farFuture.getTime() + 30 * 60 * 1000);

      mockPrisma.consultationSession.findFirst.mockResolvedValue({
        id: 'session-early',
        appointmentId: 'appt-early',
        status: ConsultationSessionStatus.SCHEDULED,
        scheduledStartTime: farFuture,
        scheduledEndTime: farFutureEnd,
        appointment: {
          patientId: 'pat-profile-1',
          patient: { user: { id: 'user-pat-1' } },
          slot: { doctorId: 'doc-profile-1', doctor: { user: { id: 'user-doc-1' } } },
        },
      });

      const details = await consultationsService.getSessionDetails(mockPatientUser, 'session-early');
      expect(details.windowStatus).toBe(TimeWindowStatus.BEFORE_WINDOW);
      expect(details.canJoin).toBe(false);
      expect(details.opensInSeconds).toBeGreaterThan(0);

      // Attempting to join throws ForbiddenException
      await expect(consultationsService.joinSession(mockPatientUser, 'session-early')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should enable joining when inside consultation window (-15m to +30m)', async () => {
      // 5 minutes before scheduled start time
      const windowOpenStart = new Date(Date.now() + 5 * 60 * 1000);
      const windowOpenEnd = new Date(windowOpenStart.getTime() + 30 * 60 * 1000);

      mockPrisma.consultationSession.findFirst.mockResolvedValue({
        id: 'session-live',
        appointmentId: 'appt-live',
        status: ConsultationSessionStatus.SCHEDULED,
        scheduledStartTime: windowOpenStart,
        scheduledEndTime: windowOpenEnd,
        appointment: {
          patientId: 'pat-profile-1',
          patient: { user: { id: 'user-pat-1' } },
          slot: { doctorId: 'doc-profile-1', doctor: { user: { id: 'user-doc-1' } } },
        },
      });
      mockPrisma.consultationSession.update.mockResolvedValue({
        id: 'session-live',
        status: ConsultationSessionStatus.IN_PROGRESS,
      });

      const details = await consultationsService.getSessionDetails(mockDoctorUser, 'session-live');
      expect(details.windowStatus).toBe(TimeWindowStatus.WINDOW_OPEN);
      expect(details.canJoin).toBe(true);

      const joined = await consultationsService.joinSession(mockDoctorUser, 'session-live');
      expect(mockPrisma.consultationSession.update).toHaveBeenCalled();
      expect(mockAudit.logEvent).toHaveBeenCalled();
    });

    it('should strictly prohibit unauthorized users from entering consultation sessions', async () => {
      const unauthorizedUser = {
        id: 'user-unauthorized',
        role: UserRole.PATIENT,
        patientProfileId: 'pat-intruder',
      };

      mockPrisma.consultationSession.findFirst.mockResolvedValue({
        id: 'session-private',
        appointmentId: 'appt-private',
        status: ConsultationSessionStatus.SCHEDULED,
        scheduledStartTime: new Date(),
        scheduledEndTime: new Date(Date.now() + 30 * 60000),
        appointment: {
          patientId: 'pat-profile-1',
          patient: { user: { id: 'user-pat-1' } },
          slot: { doctorId: 'doc-profile-1', doctor: { user: { id: 'user-doc-1' } } },
        },
      });

      await expect(
        consultationsService.getSessionDetails(unauthorizedUser, 'session-private'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should support WebRTC signaling exchanges between authorized doctor and patient', async () => {
      const liveStart = new Date(Date.now() - 5 * 60000);
      const liveEnd = new Date(Date.now() + 25 * 60000);

      mockPrisma.consultationSession.findFirst.mockResolvedValue({
        id: 'session-webrtc',
        appointmentId: 'appt-webrtc',
        status: ConsultationSessionStatus.IN_PROGRESS,
        scheduledStartTime: liveStart,
        scheduledEndTime: liveEnd,
        appointment: {
          patientId: 'pat-profile-1',
          patient: { user: { id: 'user-pat-1' } },
          slot: { doctorId: 'doc-profile-1', doctor: { user: { id: 'user-doc-1' } } },
        },
      });

      mockPrisma.consultationSignal.create.mockResolvedValue({
        id: 'sig-1',
        type: 'offer',
        data: '{"type":"offer","sdp":"mock-sdp"}',
      });

      // Doctor sends WebRTC offer
      const signal = await consultationsService.sendSignal(
        mockDoctorUser,
        'session-webrtc',
        'offer',
        { type: 'offer', sdp: 'mock-sdp' },
      );
      expect(signal.type).toBe('offer');

      // Patient polls incoming peer signals
      mockPrisma.consultationSignal.findMany.mockResolvedValue([signal]);
      const peerSignals = await consultationsService.getSignals(mockPatientUser, 'session-webrtc');
      expect(peerSignals.length).toBe(1);
    });

    it('should verify document consent before allowing patient report attachment in chat', async () => {
      const liveStart = new Date(Date.now() - 5 * 60000);
      const liveEnd = new Date(Date.now() + 25 * 60000);

      mockPrisma.consultationSession.findFirst.mockResolvedValue({
        id: 'session-chat',
        appointmentId: 'appt-chat',
        status: ConsultationSessionStatus.IN_PROGRESS,
        scheduledStartTime: liveStart,
        scheduledEndTime: liveEnd,
        appointment: {
          patientId: 'pat-profile-1',
          patient: { user: { id: 'user-pat-1' } },
          slot: { doctorId: 'doc-profile-1', doctor: { user: { id: 'user-doc-1' } } },
        },
      });

      // Patient tries to share another patient's document
      mockPrisma.medicalDocument.findUnique.mockResolvedValue({
        id: 'doc-other',
        patientId: 'different-patient-profile',
      });

      await expect(
        consultationsService.sendMessage(
          mockPatientUser,
          'session-chat',
          'Check this report',
          'doc-other',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

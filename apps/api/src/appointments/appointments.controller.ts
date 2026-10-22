import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { DoctorAvailabilityService, SetAvailabilityInput, SetExceptionInput } from './doctor-availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AppointmentBookingInput } from '@healthsync/validation';
import { AppointmentStatus } from '@healthsync/shared-types';

@ApiTags('Appointment Management')
@Controller('api/appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly doctorAvailabilityService: DoctorAvailabilityService,
  ) {}

  @Get('slots')
  @ApiOperation({ summary: 'List available appointment slots' })
  async listSlots(
    @Query('doctorId') doctorId?: string,
    @Query('facilityId') facilityId?: string,
  ) {
    const slots = await this.appointmentsService.listSlots(doctorId, facilityId);
    return {
      success: true,
      data: slots,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('slots')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new availability slots for doctor' })
  async createSlots(
    @CurrentUser() user: any,
    @Body('doctorId') doctorId: string,
    @Body('facilityId') facilityId: string,
    @Body('startTimes') startTimes: string[],
  ) {
    const slots = await this.appointmentsService.createSlots(user, doctorId, facilityId, startTimes);
    return {
      success: true,
      message: `${slots.length} appointment slots created`,
      data: slots,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Doctor Availability & Slot Management ---

  @Get('availability/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get authenticated doctor availability schedule and leave/exceptions' })
  async getMyAvailability(@CurrentUser() user: any) {
    const result = await this.doctorAvailabilityService.getMyAvailability(user);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('availability')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Configure or update weekly working hours and slot rules' })
  async setAvailability(@CurrentUser() user: any, @Body() body: SetAvailabilityInput) {
    const result = await this.doctorAvailabilityService.setAvailability(user, body);
    return {
      success: true,
      message: 'Doctor availability schedule saved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('availability/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove an availability schedule' })
  async deleteAvailability(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.doctorAvailabilityService.deleteAvailability(user, id);
    return {
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('availability/exceptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set custom date exception or leave with conflict detection' })
  async setException(@CurrentUser() user: any, @Body() body: SetExceptionInput) {
    const result = await this.doctorAvailabilityService.setException(user, body);
    return {
      success: !result.hasConflict,
      data: result,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('availability/exceptions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a date exception or leave record' })
  async deleteException(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.doctorAvailabilityService.deleteException(user, id);
    return {
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('availability/generate-slots')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate future appointment slots for the doctor' })
  async generateSlots(@CurrentUser() user: any, @Body('daysAhead') daysAhead?: number) {
    const doctor = await this.doctorAvailabilityService.getDoctorProfile(user);
    const result = await this.doctorAvailabilityService.generateSlotsForSchedule(doctor.id, undefined, daysAhead || 14);
    return {
      success: true,
      message: `Generated ${result.count} appointment slots`,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  // --- End Doctor Availability ---

  @Post('book')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Atomically book an appointment slot (prevents double booking)' })
  async bookAppointment(@CurrentUser() user: any, @Body() body: AppointmentBookingInput) {
    const appointment = await this.appointmentsService.bookAppointment(user, body);
    return {
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user appointments (Patient or Doctor)' })
  async getMyAppointments(@CurrentUser() user: any) {
    const appointments = await this.appointmentsService.getMyAppointments(user);
    return {
      success: true,
      data: appointments,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update appointment status (Confirm, Cancel, Reject, Complete)' })
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: AppointmentStatus,
    @Body('notes') notes?: string,
  ) {
    const updated = await this.appointmentsService.updateStatus(user, id, status, notes);
    return {
      success: true,
      message: `Appointment status updated to ${status}`,
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }
}

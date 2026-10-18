import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AppointmentBookingInput } from '@healthsync/validation';
import { AppointmentStatus } from '@healthsync/shared-types';

@ApiTags('Appointment Management')
@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

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

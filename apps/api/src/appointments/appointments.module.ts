import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { DoctorAvailabilityService } from './doctor-availability.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, DoctorAvailabilityService],
  exports: [AppointmentsService, DoctorAvailabilityService],
})
export class AppointmentsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { DocumentsModule } from './documents/documents.module';
import { ConsentModule } from './consent/consent.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AIModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
    DocumentsModule,
    ConsentModule,
    DoctorsModule,
    PatientsModule,
    FacilitiesModule,
    AppointmentsModule,
    AIModule,
    AdminModule,
  ],
})
export class AppModule {}

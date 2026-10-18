import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DoctorsService, CreateEncounterParams } from './doctors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PrescriptionCreateInput } from '@healthsync/validation';

@ApiTags('Doctors & Clinical Care')
@Controller('api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('directory')
  @ApiOperation({ summary: 'List and filter healthcare providers by specialty, facility, or search term' })
  async getDirectory(
    @Query('specialty') specialty?: string,
    @Query('facilityId') facilityId?: string,
    @Query('search') search?: string,
  ) {
    const list = await this.doctorsService.getDirectory({ specialty, facilityId, search });
    return {
      success: true,
      data: list,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('authorized-patients')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List patients who have granted active consent to the current doctor' })
  async getAuthorizedPatients(@CurrentUser() user: any) {
    const patients = await this.doctorsService.getAuthorizedPatients(user);
    return {
      success: true,
      data: patients,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('patients/:patientId/records')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'View patient records filtered strictly by active consent grant' })
  async getPatientAuthorizedRecords(
    @CurrentUser() user: any,
    @Param('patientId') patientId: string,
  ) {
    const records = await this.doctorsService.getPatientAuthorizedRecords(user, patientId);
    return {
      success: true,
      data: records,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('encounters')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record clinical consultation notes and vitals' })
  async createEncounter(@CurrentUser() user: any, @Body() body: CreateEncounterParams) {
    const encounter = await this.doctorsService.createEncounter(user, body);
    return {
      success: true,
      message: 'Clinical encounter recorded successfully',
      data: encounter,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('prescriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create digital prescription for patient' })
  async createPrescription(@CurrentUser() user: any, @Body() body: PrescriptionCreateInput) {
    const prescription = await this.doctorsService.createPrescription(user, body);
    return {
      success: true,
      message: 'Prescription generated with cryptographic checksum integrity verification',
      data: prescription,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('quick-access')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlock patient clinical records using Patient ID and Access Code' })
  async quickAccess(
    @CurrentUser() user: any,
    @Body('patientIdentifier') patientIdentifier: string,
    @Body('accessCode') accessCode: string,
  ) {
    if (!patientIdentifier || !accessCode) {
      throw new BadRequestException('Both Patient Identifier and Access Code are required');
    }
    const result = await this.doctorsService.quickAccessLookup(user, patientIdentifier, accessCode);
    return {
      success: true,
      message: 'Access code verified. Patient clinical file unlocked.',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}


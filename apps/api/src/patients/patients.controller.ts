import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PatientProfileInput } from '@healthsync/validation';

@ApiTags('Patient Profile & Timeline')
@Controller('api/patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current authenticated patient medical profile' })
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.patientsService.getProfile(user);
    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update patient clinical profile and emergency contacts' })
  async updateProfile(@CurrentUser() user: any, @Body() body: PatientProfileInput) {
    const updated = await this.patientsService.updateProfile(user, body);
    return {
      success: true,
      message: 'Profile updated successfully',
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get unified chronological health history timeline' })
  async getTimeline(@CurrentUser() user: any) {
    const timeline = await this.patientsService.getMedicalTimeline(user);
    return {
      success: true,
      data: timeline,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('vitals/trends')
  @ApiOperation({ summary: 'Get longitudinal vitals & metabolic trends for Recharts graphing' })
  async getVitalsTrends(@CurrentUser() user: any) {
    const trends = await this.patientsService.getVitalsTrends(user);
    return {
      success: true,
      data: trends,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // DAILY HEALTH LOGS (BP, SUGAR, VITALS)
  // ==========================================
  @Get('daily-health-logs')
  @ApiOperation({ summary: 'Get daily health logs (sugar, BP, pulse) and calculated averages' })
  async getDailyHealthLogs(@CurrentUser() user: any) {
    const res = await this.patientsService.getDailyHealthLogs(user);
    return {
      success: true,
      data: res,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('daily-health-logs')
  @ApiOperation({ summary: 'Record daily health report (blood sugar, blood pressure, vitals)' })
  async addDailyHealthLog(@CurrentUser() user: any, @Body() body: any) {
    const created = await this.patientsService.addDailyHealthLog(user, body);
    return {
      success: true,
      message: 'Daily health metric logged successfully',
      data: created,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('daily-health-logs/:id')
  @ApiOperation({ summary: 'Delete a daily health metric entry' })
  async deleteDailyHealthLog(@CurrentUser() user: any, @Param('id') id: string) {
    const deleted = await this.patientsService.deleteDailyHealthLog(user, id);
    return {
      success: true,
      message: 'Daily health log deleted',
      data: deleted,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // MEDICAL RECORDS & ALLERGIES/CONDITIONS
  // ==========================================
  @Post('records')
  @ApiOperation({ summary: 'Add a new personal medical record or health event' })
  async createMedicalRecord(@CurrentUser() user: any, @Body() body: any) {
    const record = await this.patientsService.createMedicalRecord(user, body);
    return {
      success: true,
      message: 'Medical record added successfully',
      data: record,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('records/:id')
  @ApiOperation({ summary: 'Delete a personal medical record' })
  async deleteMedicalRecord(@CurrentUser() user: any, @Param('id') id: string) {
    const res = await this.patientsService.deleteMedicalRecord(user, id);
    return {
      success: true,
      message: 'Medical record removed',
      data: res,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('allergies')
  @ApiOperation({ summary: 'Add a known allergy' })
  async createAllergy(@CurrentUser() user: any, @Body() body: any) {
    const allergy = await this.patientsService.createAllergy(user, body);
    return {
      success: true,
      message: 'Allergy recorded',
      data: allergy,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('allergies/:id')
  @ApiOperation({ summary: 'Delete an allergy' })
  async deleteAllergy(@CurrentUser() user: any, @Param('id') id: string) {
    const res = await this.patientsService.deleteAllergy(user, id);
    return {
      success: true,
      message: 'Allergy removed',
      data: res,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('conditions')
  @ApiOperation({ summary: 'Add a medical condition' })
  async createCondition(@CurrentUser() user: any, @Body() body: any) {
    const condition = await this.patientsService.createCondition(user, body);
    return {
      success: true,
      message: 'Medical condition recorded',
      data: condition,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('conditions/:id')
  @ApiOperation({ summary: 'Delete a medical condition' })
  async deleteCondition(@CurrentUser() user: any, @Param('id') id: string) {
    const res = await this.patientsService.deleteCondition(user, id);
    return {
      success: true,
      message: 'Medical condition removed',
      data: res,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('regenerate-access-code')
  @ApiOperation({ summary: 'Generate a new doctor quick-access consultation code' })
  async regenerateAccessCode(@CurrentUser() user: any) {
    const res = await this.patientsService.regenerateAccessCode(user);
    return {
      success: true,
      message: 'Access code regenerated successfully',
      data: res,
      timestamp: new Date().toISOString(),
    };
  }
}


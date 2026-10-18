import { Controller, Get, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '@healthsync/shared-types';

@ApiTags('Audit & Compliance')
@Controller('api/audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('my-logs')
  @ApiOperation({ summary: 'Get audit trail of who accessed the authenticated patient’s records' })
  async getMyAuditLogs(@CurrentUser() user: any) {
    if (user.role === UserRole.PATIENT) {
      if (!user.patientProfileId) {
        return { success: true, data: [] };
      }
      const logs = await this.auditService.getPatientAuditLogs(user.patientProfileId);
      return { success: true, data: logs, timestamp: new Date().toISOString() };
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      const logs = await this.auditService.getAllAuditLogs(100);
      return { success: true, data: logs, timestamp: new Date().toISOString() };
    }

    throw new ForbiddenException('Only patients and platform administrators can view security audit logs');
  }

  @Get('all')
  @ApiOperation({ summary: 'Get system-wide audit logs (Platform Admin only)' })
  async getAllLogs(@CurrentUser() user: any) {
    if (user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only platform administrators can review system-wide audit logs');
    }
    const logs = await this.auditService.getAllAuditLogs(200);
    return { success: true, data: logs, timestamp: new Date().toISOString() };
  }
}

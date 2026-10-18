import { Controller, Post, Get, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConsentGrantInput, AccessRequestInput, BreakGlassInput } from '@healthsync/validation';

@ApiTags('Consent & Permission Grants')
@Controller('api/consent')
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('grants')
  @ApiOperation({ summary: 'Create a scoped consent grant for a healthcare provider' })
  async createGrant(@CurrentUser() user: any, @Body() body: ConsentGrantInput) {
    const grant = await this.consentService.createGrant(user, body);
    return {
      success: true,
      message: 'Consent grant issued successfully and anchored on cryptographic ledger',
      data: grant,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my-grants')
  @ApiOperation({ summary: 'List all consent grants for current authenticated patient' })
  async listMyGrants(@CurrentUser() user: any) {
    const grants = await this.consentService.listPatientGrants(user);
    return {
      success: true,
      data: grants,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('doctor-grants')
  @ApiOperation({ summary: 'List all active patient consent grants granted to current doctor' })
  async listDoctorGrants(@CurrentUser() user: any) {
    const grants = await this.consentService.listDoctorGrants(user);
    return {
      success: true,
      data: grants,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('grants/:id')
  @ApiOperation({ summary: 'Revoke an active consent grant immediately' })
  async revokeGrant(
    @CurrentUser() user: any,
    @Param('id') grantId: string,
    @Body('reason') reason?: string,
  ) {
    const updated = await this.consentService.revokeGrant(user, grantId, reason);
    return {
      success: true,
      message: 'Consent grant revoked immediately. Future access requests will be rejected.',
      data: updated,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('requests')
  @ApiOperation({ summary: 'Doctor requests record access from a patient' })
  async requestAccess(@CurrentUser() user: any, @Body() body: AccessRequestInput) {
    const request = await this.consentService.requestAccess(user, body);
    return {
      success: true,
      message: 'Access request submitted to patient for review',
      data: request,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('requests')
  @ApiOperation({ summary: 'List pending access requests' })
  async listRequests(@CurrentUser() user: any) {
    const requests = await this.consentService.listAccessRequests(user);
    return {
      success: true,
      data: requests,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('requests/:id/respond')
  @ApiOperation({ summary: 'Patient approves or rejects a doctor access request' })
  async respondRequest(
    @CurrentUser() user: any,
    @Param('id') requestId: string,
    @Body('approve') approve: boolean,
  ) {
    const result = await this.consentService.respondAccessRequest(user, requestId, approve);
    return {
      success: true,
      message: approve ? 'Access request approved' : 'Access request rejected',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('break-glass')
  @ApiOperation({ summary: 'Audited emergency break-glass record access for critical care' })
  async breakGlass(@CurrentUser() user: any, @Body() body: BreakGlassInput) {
    const result = await this.consentService.breakGlassAccess(user, body);
    return {
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}

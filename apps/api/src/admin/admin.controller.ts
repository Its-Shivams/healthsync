import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VerificationStatus } from '@healthsync/shared-types';

@ApiTags('Platform & Hospital Administration')
@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Platform operational health and system statistics' })
  async getMetrics(@CurrentUser() user: any) {
    const metrics = await this.adminService.getPlatformMetrics(user);
    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('organizations')
  @ApiOperation({ summary: 'List healthcare networks and participating facilities' })
  async getOrganizations() {
    const orgs = await this.adminService.getOrganizations();
    return {
      success: true,
      data: orgs,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('facilities')
  @ApiOperation({ summary: 'List all clinics and hospitals with verification status' })
  async getFacilities() {
    const facilities = await this.adminService.getFacilitiesForAdmin();
    return {
      success: true,
      data: facilities,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('verify-provider/:id')
  @ApiOperation({ summary: 'Platform Administrator certifies or revokes doctor license verification' })
  async verifyProvider(
    @CurrentUser() user: any,
    @Param('id') doctorId: string,
    @Body('status') status: VerificationStatus,
    @Body('comments') comments?: string,
  ) {
    const result = await this.adminService.verifyProvider(user, doctorId, status, comments);
    return {
      success: true,
      message: `Doctor verification updated to ${status}`,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('verify-facility/:id')
  @ApiOperation({ summary: 'Administrator verifies or revokes a clinic or hospital' })
  async verifyFacility(
    @CurrentUser() user: any,
    @Param('id') facilityId: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    const result = await this.adminService.verifyFacility(user, facilityId, isVerified);
    return {
      success: true,
      message: `Facility verification updated to ${isVerified ? 'VERIFIED' : 'UNVERIFIED'}`,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('facilities')
  @ApiOperation({ summary: 'Add a new clinic or hospital facility' })
  async createFacility(@CurrentUser() user: any, @Body() body: any) {
    const facility = await this.adminService.createFacility(user, body);
    return {
      success: true,
      message: 'Healthcare facility added successfully',
      data: facility,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('doctors')
  @ApiOperation({ summary: 'Register and onboard a healthcare provider / doctor' })
  async createDoctor(@CurrentUser() user: any, @Body() body: any) {
    const res = await this.adminService.createDoctor(user, body);
    return {
      success: true,
      message: 'Doctor account created and verified',
      data: res,
      timestamp: new Date().toISOString(),
    };
  }
}

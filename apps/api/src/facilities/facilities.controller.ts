import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FacilitiesService } from './facilities.service';
import { FacilityType } from '@healthsync/shared-types';

@ApiTags('Hospital & Clinic Discovery')
@Controller('api/facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search healthcare facilities by coordinates, radius, specialty, or keywords' })
  async searchFacilities(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('specialty') specialty?: string,
    @Query('facilityType') facilityType?: FacilityType,
    @Query('q') q?: string,
  ) {
    const facilities = await this.facilitiesService.searchFacilities({
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : 10,
      specialty,
      facilityType,
      searchQuery: q,
    });

    return {
      success: true,
      data: facilities,
      count: facilities.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility details and available appointment roster' })
  async getFacility(@Param('id') id: string) {
    const facility = await this.facilitiesService.getFacilityById(id);
    return {
      success: true,
      data: facility,
      timestamp: new Date().toISOString(),
    };
  }
}

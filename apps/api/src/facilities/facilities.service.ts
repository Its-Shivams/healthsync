import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacilityType } from '@healthsync/shared-types';

export interface SearchFacilitiesParams {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  specialty?: string;
  facilityType?: FacilityType;
  searchQuery?: string;
}

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async searchFacilities(params: SearchFacilitiesParams) {
    const { latitude, longitude, radiusKm = 10, specialty, facilityType, searchQuery } = params;

    const allFacilities = await this.prisma.healthcareFacility.findMany({
      include: {
        organization: true,
        appointmentSlots: {
          where: {
            isBooked: false,
            startTime: { gt: new Date() },
          },
          take: 5,
        },
      },
    });

    let results = allFacilities.map((f) => {
      let distanceKm: number | undefined = undefined;
      if (latitude !== undefined && longitude !== undefined) {
        distanceKm = this.calculateHaversineDistance(latitude, longitude, f.latitude, f.longitude);
      }

      return {
        id: f.id,
        name: f.name,
        type: f.type,
        address: f.address,
        city: f.city,
        state: f.state,
        postalCode: f.postalCode,
        latitude: f.latitude,
        longitude: f.longitude,
        contactPhone: f.contactPhone,
        contactEmail: f.contactEmail,
        operatingHours: f.operatingHours,
        specialties: f.specialties ? f.specialties.split(',').map((s) => s.trim()) : [],
        availableServices: f.availableServices ? f.availableServices.split(',').map((s) => s.trim()) : [],
        hasEmergencyUnit: f.hasEmergencyUnit,
        isVerified: f.isVerified,
        availableSlotsCount: f.appointmentSlots.length,
        distanceKm: distanceKm !== undefined ? parseFloat(distanceKm.toFixed(1)) : undefined,
        organizationName: f.organization.name,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ', ' + f.city + ', ' + f.state)}`,
        googleMapsDirectionsUrl:
          latitude !== undefined && longitude !== undefined
            ? `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${f.latitude},${f.longitude}`
            : `https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`,
      };
    });

    // Filter by type
    if (facilityType) {
      results = results.filter((f) => f.type === facilityType);
    }

    // Filter by specialty
    if (specialty) {
      const lower = specialty.toLowerCase();
      results = results.filter((f) => f.specialties.some((s) => s.toLowerCase().includes(lower)));
    }

    // Filter by query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.address.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          f.specialties.some((s) => s.toLowerCase().includes(q)),
      );
    }

    // Sort by proximity when coordinates are provided
    if (latitude !== undefined && longitude !== undefined) {
      results.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));

      // If user specified radius, filter only if there are facilities within that radius
      // otherwise maintain visibility so no user ever sees an empty map/list
      if (radiusKm) {
        const withinRadius = results.filter((f) => f.distanceKm !== undefined && f.distanceKm <= radiusKm);
        if (withinRadius.length > 0) {
          results = withinRadius;
        }
      }
    }

    return results;
  }

  async getFacilityById(id: string) {
    const facility = await this.prisma.healthcareFacility.findUnique({
      where: { id },
      include: {
        organization: true,
        appointmentSlots: {
          where: {
            startTime: { gt: new Date() },
          },
          include: {
            doctor: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                specialties: true,
              },
            },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!facility) {
      throw new NotFoundException('Healthcare facility not found');
    }

    return facility;
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth's radius in km

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, VerificationStatus } from '@healthsync/shared-types';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformMetrics(user: any) {
    if (user.role !== UserRole.PLATFORM_ADMIN && user.role !== UserRole.HOSPITAL_ADMIN) {
      throw new ForbiddenException('Restricted to administrators');
    }

    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      totalDocuments,
      totalPrescriptions,
      totalAppointments,
      totalConsentGrants,
      totalAuditEvents,
      totalFacilities,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.patientProfile.count(),
      this.prisma.doctorProfile.count(),
      this.prisma.medicalDocument.count(),
      this.prisma.prescription.count(),
      this.prisma.appointment.count(),
      this.prisma.consentGrant.count(),
      this.prisma.accessAuditEvent.count(),
      this.prisma.healthcareFacility.count(),
    ]);

    return {
      totalUsers,
      totalPatients,
      totalDoctors,
      totalDocuments,
      totalPrescriptions,
      totalAppointments,
      totalConsentGrants,
      totalAuditEvents,
      totalFacilities,
      systemUptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
    };
  }

  async verifyProvider(adminUser: any, doctorId: string, status: VerificationStatus, comments?: string) {
    if (adminUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only platform administrators can certify healthcare providers');
    }

    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const updated = await this.prisma.doctorProfile.update({
      where: { id: doctorId },
      data: { verificationStatus: status },
    });

    await this.prisma.providerVerification.create({
      data: {
        doctorId,
        registrySource: 'NATIONAL_MEDICAL_COMMISSION',
        registrationNumber: doctor.licenseNumber,
        verifiedByAdminId: adminUser.id,
        verificationStatus: status,
        comments: comments || `Verified by ${adminUser.firstName} ${adminUser.lastName}`,
      },
    });

    return updated;
  }

  async verifyFacility(adminUser: any, facilityId: string, isVerified: boolean) {
    if (adminUser.role !== UserRole.PLATFORM_ADMIN && adminUser.role !== UserRole.HOSPITAL_ADMIN) {
      throw new ForbiddenException('Only administrators can verify healthcare facilities');
    }

    const facility = await this.prisma.healthcareFacility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      throw new NotFoundException('Healthcare facility not found');
    }

    const updated = await this.prisma.healthcareFacility.update({
      where: { id: facilityId },
      data: { isVerified },
    });

    return updated;
  }

  async getFacilitiesForAdmin() {
    return this.prisma.healthcareFacility.findMany({
      include: {
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrganizations() {
    return this.prisma.healthcareOrganization.findMany({
      include: {
        facilities: true,
        laboratories: true,
        memberships: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, role: true } },
          },
        },
      },
    });
  }

  async createFacility(adminUser: any, data: any) {
    if (adminUser.role !== UserRole.PLATFORM_ADMIN && adminUser.role !== UserRole.HOSPITAL_ADMIN) {
      throw new ForbiddenException('Only administrators can add healthcare facilities');
    }

    let orgId = data.organizationId;
    if (!orgId) {
      const defaultOrg = await this.prisma.healthcareOrganization.findFirst();
      if (defaultOrg) {
        orgId = defaultOrg.id;
      } else {
        const createdOrg = await this.prisma.healthcareOrganization.create({
          data: {
            name: 'HealthSync Healthcare Network',
            code: `HS-ORG-${Date.now().toString().slice(-4)}`,
            legalType: 'HOSPITAL',
            licenseNumber: `LIC-${Date.now().toString().slice(-6)}`,
            address: data.address || 'Institutional Area',
            city: data.city || 'New Delhi',
            state: data.state || 'Delhi',
            postalCode: data.postalCode || '110001',
            contactPhone: data.contactPhone || '+91-11-20001111',
            contactEmail: data.contactEmail || 'network@healthsync.mock',
            isVerified: true,
          },
        });
        orgId = createdOrg.id;
      }
    }

    return this.prisma.healthcareFacility.create({
      data: {
        organizationId: orgId,
        name: data.name,
        type: data.type || 'SPECIALITY_CLINIC',
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        latitude: Number(data.latitude) || 28.5672,
        longitude: Number(data.longitude) || 77.2100,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        operatingHours: data.operatingHours || 'Mon-Sat: 09:00 AM - 07:00 PM',
        specialties: data.specialties || 'General Medicine,Pediatrics',
        availableServices: data.availableServices || 'OPD,Diagnostics,Emergency',
        hasEmergencyUnit: data.hasEmergencyUnit === true || data.hasEmergencyUnit === 'true',
        isVerified: true,
      },
    });
  }

  async createDoctor(adminUser: any, data: any) {
    if (adminUser.role !== UserRole.PLATFORM_ADMIN && adminUser.role !== UserRole.HOSPITAL_ADMIN) {
      throw new ForbiddenException('Only administrators can register healthcare providers');
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(data.password || 'HealthSync@2025', 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber || null,
        role: UserRole.DOCTOR,
      },
    });

    const doctorProfile = await this.prisma.doctorProfile.create({
      data: {
        userId: user.id,
        licenseNumber: data.licenseNumber,
        experienceYears: Number(data.experienceYears) || 5,
        bio: data.bio || `Specialist registered at ${new Date().toLocaleDateString()}`,
        consultationFee: Number(data.consultationFee) || 800,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });

    if (data.specialty) {
      await this.prisma.providerSpecialty.create({
        data: {
          doctorId: doctorProfile.id,
          name: data.specialty.toUpperCase(),
          isPrimary: true,
        },
      });
    }

    return { user, doctorProfile };
  }
}


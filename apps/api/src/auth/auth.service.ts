import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@healthsync/shared-types';
import {
  RegisterInput,
  RegisterPatientInput,
  RegisterDoctorInput,
  RegisterHospitalAdminInput,
  RegisterLabAdminInput,
  LoginInput,
} from '@healthsync/validation';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        role: input.role,
        patientProfile:
          input.role === UserRole.PATIENT
            ? {
                create: {
                  dateOfBirth: new Date('1995-01-01'),
                  gender: 'PREFER_NOT_TO_SAY',
                  bloodGroup: 'O+',
                  address: 'Pending address update',
                  city: 'New Delhi',
                  state: 'Delhi',
                  postalCode: '110001',
                  accessCode: `HS-${Math.floor(1000 + Math.random() * 9000)}`,
                },
              }
            : undefined,
        doctorProfile:
          input.role === UserRole.DOCTOR
            ? {
                create: {
                  licenseNumber: `PROV-${Date.now().toString().slice(-6)}`,
                  experienceYears: 1,
                  verificationStatus: 'PENDING_REVIEW', // Unverified until platform admin approves
                  consultationFee: 500,
                },
              }
            : undefined,
      },
      include: {
        patientProfile: true,
        doctorProfile: true,
      },
    });

    await this.prisma.accessAuditEvent.create({
      data: {
        actorUserId: user.id,
        targetPatientId: user.patientProfile?.id,
        resourceType: 'AUTH',
        action: 'REGISTER',
        status: 'SUCCESS',
      },
    });

    const token = this.generateToken(user);
    return {
      user: this.formatUser(user),
      token,
    };
  }

  async registerPatient(input: RegisterPatientInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const accessCode = `HS-${Math.floor(1000 + Math.random() * 9000)}`;

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        role: UserRole.PATIENT,
        patientProfile: {
          create: {
            dateOfBirth: new Date(input.dateOfBirth),
            gender: input.gender,
            bloodGroup: input.bloodGroup,
            address: input.address,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            heightCm: input.heightCm,
            weightKg: input.weightKg,
            accessCode,
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });

    await this.prisma.accessAuditEvent.create({
      data: {
        actorUserId: user.id,
        targetPatientId: user.patientProfile?.id,
        resourceType: 'AUTH',
        action: 'REGISTER_PATIENT',
        status: 'SUCCESS',
      },
    });

    const token = this.generateToken(user);
    return {
      user: this.formatUser(user),
      token,
    };
  }

  async registerDoctor(input: RegisterDoctorInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const existingLicense = await this.prisma.doctorProfile.findUnique({
      where: { licenseNumber: input.licenseNumber.trim() },
    });
    if (existingLicense) {
      throw new ConflictException('A practitioner profile with this license number already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        role: UserRole.DOCTOR,
        doctorProfile: {
          create: {
            licenseNumber: input.licenseNumber.trim(),
            experienceYears: input.experienceYears || 0,
            consultationFee: input.consultationFee || 0,
            bio: input.bio || `Specialist in ${input.specialty}. Credentials pending platform verification.`,
            verificationStatus: 'PENDING_REVIEW', // Strictly pending review
            specialties: {
              create: {
                name: input.specialty,
                isPrimary: true,
              },
            },
            affiliations: input.facilityId
              ? {
                  create: {
                    facilityId: input.facilityId,
                    consultationFee: input.consultationFee || 0,
                    scheduleDays: 'Mon-Fri',
                    roomOrOpdNumber: 'Pending Allocation',
                    isPrimary: true,
                  },
                }
              : undefined,
          },
        },
      },
      include: {
        doctorProfile: {
          include: {
            specialties: true,
            affiliations: {
              include: { facility: true },
            },
          },
        },
      },
    });

    await this.prisma.accessAuditEvent.create({
      data: {
        actorUserId: user.id,
        resourceType: 'AUTH',
        action: 'REGISTER_DOCTOR',
        status: 'SUCCESS',
        overrideJustification: `Doctor registered with license ${input.licenseNumber}. Status: PENDING_REVIEW`,
      },
    });

    const token = this.generateToken(user);
    return {
      user: this.formatUser(user),
      token,
    };
  }

  async registerHospitalAdmin(input: RegisterHospitalAdminInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const existingOrg = await this.prisma.healthcareOrganization.findUnique({
      where: { licenseNumber: input.licenseNumber.trim() },
    });
    if (existingOrg) {
      throw new ConflictException('A healthcare organization with this license number already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const orgCode = `ORG-${Date.now().toString().slice(-6)}`;

    // Create User, Organization (unverified), Primary Facility (unverified), and Membership
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        role: UserRole.HOSPITAL_ADMIN,
      },
    });

    const org = await this.prisma.healthcareOrganization.create({
      data: {
        name: input.organizationName,
        code: orgCode,
        legalType: input.legalType,
        licenseNumber: input.licenseNumber.trim(),
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        isVerified: false, // Strictly unverified until platform admin approves
        facilities: {
          create: {
            name: input.organizationName,
            type: input.facilityType,
            address: input.address,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            latitude: 28.6139,
            longitude: 77.2090,
            contactPhone: input.contactPhone,
            contactEmail: input.contactEmail,
            operatingHours: input.operatingHours,
            specialties: input.specialties,
            availableServices: input.availableServices,
            hasEmergencyUnit: input.hasEmergencyUnit,
            isVerified: false, // Strictly unverified until approved
          },
        },
        memberships: {
          create: {
            userId: user.id,
            roleInOrg: 'ADMIN',
            isActive: true,
          },
        },
      },
      include: {
        facilities: true,
      },
    });

    await this.prisma.accessAuditEvent.create({
      data: {
        actorUserId: user.id,
        resourceType: 'AUTH',
        action: 'REGISTER_HOSPITAL_ADMIN',
        status: 'SUCCESS',
        overrideJustification: `Hospital registered: ${input.organizationName} (${orgCode}). Status: UNVERIFIED`,
      },
    });

    const token = this.generateToken(user);
    return {
      user: {
        ...this.formatUser(user),
        organization: org,
      },
      token,
    };
  }

  async registerLabAdmin(input: RegisterLabAdminInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const existingLab = await this.prisma.laboratory.findFirst({
      where: { licenseNumber: input.licenseNumber.trim() },
    });
    if (existingLab) {
      throw new ConflictException('A diagnostic laboratory with this license number already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const orgCode = `LAB-ORG-${Date.now().toString().slice(-6)}`;

    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        role: UserRole.LAB_ADMIN,
      },
    });

    const org = await this.prisma.healthcareOrganization.create({
      data: {
        name: input.labName,
        code: orgCode,
        legalType: 'DIAGNOSTIC_CHAIN',
        licenseNumber: input.licenseNumber.trim(),
        address: input.address,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        isVerified: false,
        laboratories: {
          create: {
            name: input.labName,
            licenseNumber: input.licenseNumber.trim(),
            accreditation: input.accreditation,
            address: input.address,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            contactPhone: input.contactPhone,
            contactEmail: input.contactEmail,
            availableTests: input.availableTests,
            isVerified: false, // Strictly unverified until approved
          },
        },
        memberships: {
          create: {
            userId: user.id,
            roleInOrg: 'LAB_DIRECTOR',
            isActive: true,
          },
        },
      },
      include: {
        laboratories: true,
      },
    });

    await this.prisma.accessAuditEvent.create({
      data: {
        actorUserId: user.id,
        resourceType: 'AUTH',
        action: 'REGISTER_LAB_ADMIN',
        status: 'SUCCESS',
        overrideJustification: `Diagnostic laboratory registered: ${input.labName}. Status: UNVERIFIED`,
      },
    });

    const token = this.generateToken(user);
    return {
      user: {
        ...this.formatUser(user),
        organization: org,
        laboratory: org.laboratories[0],
      },
      token,
    };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        patientProfile: true,
        doctorProfile: {
          include: {
            specialties: true,
            affiliations: { include: { facility: true } },
          },
        },
        organizationMembers: {
          include: {
            organization: {
              include: {
                facilities: true,
                laboratories: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated. Please contact administrator.');
    }

    // Record audit event
    await this.prisma.accessAuditEvent.create({
      data: {
        actorUserId: user.id,
        targetPatientId: (user as any).patientProfile?.id,
        resourceType: 'AUTH',
        action: 'LOGIN',
        status: 'SUCCESS',
      },
    });

    const token = this.generateToken(user);
    return {
      user: this.formatUser(user),
      token,
    };
  }

  async demoLogin(role: UserRole) {
    let email = 'patient.aarav@healthsync.mock';
    if (role === UserRole.DOCTOR) email = 'doctor.priya@healthsync.mock';
    if (role === UserRole.HOSPITAL_ADMIN) email = 'hospital.admin@apex.mock';
    if (role === UserRole.LAB_ADMIN || role === UserRole.LAB_TECHNICIAN) email = 'lab.admin@apex.mock';
    if (role === UserRole.PLATFORM_ADMIN) email = 'admin@healthsync.mock';

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        patientProfile: true,
        doctorProfile: {
          include: {
            specialties: true,
            affiliations: { include: { facility: true } },
          },
        },
        organizationMembers: {
          include: {
            organization: {
              include: {
                facilities: true,
                laboratories: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException(`Demo account for role ${role} not found. Please run seed script.`);
    }

    const token = this.generateToken(user);
    return {
      user: this.formatUser(user),
      token,
    };
  }

  async logout(token?: string) {
    if (token) {
      try {
        const decoded = this.jwtService.decode(token) as any;
        if (decoded?.sub) {
          await this.prisma.accessAuditEvent.create({
            data: {
              actorUserId: decoded.sub,
              targetPatientId: decoded.patientProfileId || null,
              resourceType: 'AUTH',
              action: 'LOGOUT',
              status: 'SUCCESS',
            },
          });
        }
      } catch {
        // Non-blocking audit failure
      }
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: {
          include: {
            emergencyContacts: true,
            allergies: true,
            conditions: true,
          },
        },
        doctorProfile: {
          include: {
            specialties: true,
            affiliations: {
              include: { facility: true },
            },
          },
        },
        organizationMembers: {
          include: {
            organization: {
              include: {
                facilities: true,
                laboratories: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.formatUser(user);
  }

  private generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      patientProfileId: user.patientProfile?.id,
      doctorProfileId: user.doctorProfile?.id,
    };
    return this.jwtService.sign(payload);
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive,
      isMfaEnabled: user.isMfaEnabled,
      avatarUrl: user.avatarUrl,
      patientProfile: user.patientProfile,
      doctorProfile: user.doctorProfile,
      organizationMembers: user.organizationMembers,
    };
  }
}

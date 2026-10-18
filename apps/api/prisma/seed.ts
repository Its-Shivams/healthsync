import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HealthSync idempotent synthetic data seed...');

  const passwordHash = await bcrypt.hash('HealthSync@2025', 10);

  // ==========================================
  // 1. Healthcare Organizations
  // ==========================================
  const org1 = await prisma.healthcareOrganization.upsert({
    where: { code: 'APEX-HLTH-01' },
    update: {
      name: 'Apex Healthcare Network',
      licenseNumber: 'HOSP-DEL-2019-8821',
      legalType: 'HOSPITAL',
      address: 'Plot 14, Institutional Area, Sector 5',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110075',
      country: 'India',
      contactPhone: '+91-11-28080001',
      contactEmail: 'contact@apexhealthcare.mock',
      isVerified: true,
    },
    create: {
      name: 'Apex Healthcare Network',
      code: 'APEX-HLTH-01',
      legalType: 'HOSPITAL',
      licenseNumber: 'HOSP-DEL-2019-8821',
      address: 'Plot 14, Institutional Area, Sector 5',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110075',
      country: 'India',
      contactPhone: '+91-11-28080001',
      contactEmail: 'contact@apexhealthcare.mock',
      isVerified: true,
    },
  });

  const org2 = await prisma.healthcareOrganization.upsert({
    where: { code: 'METRO-CARE-02' },
    update: {
      name: 'Metro Care Heart & Diagnostics',
      licenseNumber: 'CLINIC-DEL-2021-4432',
      legalType: 'CLINIC_CHAIN',
      address: '22 Ring Road, Lajpat Nagar III',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110024',
      country: 'India',
      contactPhone: '+91-11-29840002',
      contactEmail: 'admin@metrocare.mock',
      isVerified: true,
    },
    create: {
      name: 'Metro Care Heart & Diagnostics',
      code: 'METRO-CARE-02',
      legalType: 'CLINIC_CHAIN',
      licenseNumber: 'CLINIC-DEL-2021-4432',
      address: '22 Ring Road, Lajpat Nagar III',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110024',
      country: 'India',
      contactPhone: '+91-11-29840002',
      contactEmail: 'admin@metrocare.mock',
      isVerified: true,
    },
  });

  // ==========================================
  // 2. Facilities
  // ==========================================
  const facilitiesData = [
    {
      organizationId: org1.id,
      name: 'Apex Super Speciality Hospital',
      type: 'GENERAL_HOSPITAL',
      address: 'Plot 14, Institutional Area, Sector 5',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110075',
      latitude: 28.5921,
      longitude: 77.0460,
      contactPhone: '+91-11-28080112',
      contactEmail: 'emergency@apexhealthcare.mock',
      operatingHours: '24/7 Emergency & Inpatient Services',
      specialties: 'Cardiology,Neurology,General Medicine,Orthopedics,Pediatrics,Gynecology',
      availableServices: 'ICU,24/7 Trauma,CT Scan,MRI,Cath Lab,Diagnostic Pathology',
      hasEmergencyUnit: true,
      isVerified: true,
    },
    {
      organizationId: org2.id,
      name: 'Metro Care Heart & Multispeciality Clinic',
      type: 'SPECIALITY_CLINIC',
      address: '22 Ring Road, Lajpat Nagar III',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110024',
      latitude: 28.5677,
      longitude: 77.2433,
      contactPhone: '+91-11-29840115',
      contactEmail: 'appointments@metrocare.mock',
      operatingHours: 'Mon-Sat: 08:00 AM - 08:00 PM',
      specialties: 'Cardiology,Dermatology,Internal Medicine',
      availableServices: 'ECG,Echocardiography,TMT,Consultations,Pharmacy',
      hasEmergencyUnit: false,
      isVerified: true,
    },
    {
      organizationId: org1.id,
      name: 'All India Institute of Medical Sciences (AIIMS)',
      type: 'GENERAL_HOSPITAL',
      address: 'Sri Aurobindo Marg, Ansari Nagar',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110029',
      latitude: 28.5672,
      longitude: 77.2100,
      contactPhone: '+91-11-26588500',
      contactEmail: 'info@aiims.edu',
      operatingHours: '24/7 Apex Tertiary Referral & Trauma Services',
      specialties: 'Cardiology,Neurology,Orthopedics,Oncology,Pediatrics,Nephrology',
      availableServices: 'ICU,Organ Transplant,PET-CT,Advanced Robotic Surgery,Blood Bank',
      hasEmergencyUnit: true,
      isVerified: true,
    },
    {
      organizationId: org1.id,
      name: 'Max Super Speciality Hospital Saket',
      type: 'GENERAL_HOSPITAL',
      address: '1, 2, Press Enclave Marg, Saket',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110017',
      latitude: 28.5284,
      longitude: 77.2119,
      contactPhone: '+91-11-26515050',
      contactEmail: 'saket@maxhealthcare.mock',
      operatingHours: '24/7 Emergency & Critical Care',
      specialties: 'Cardiology,Neurosciences,Orthopedics,Pulmonology,Internal Medicine',
      availableServices: 'Trauma Unit,Cardiac Cath Lab,Linear Accelerator,NICU',
      hasEmergencyUnit: true,
      isVerified: true,
    },
    {
      organizationId: org2.id,
      name: 'Sunrise Community Clinic & Polyclinic',
      type: 'SPECIALITY_CLINIC',
      address: 'Shop 12-14, Galleria Market, DLF Phase IV',
      city: 'Gurugram',
      state: 'Haryana',
      postalCode: '122002',
      latitude: 28.4678,
      longitude: 77.0825,
      contactPhone: '+91-124-4209911',
      contactEmail: 'contact@sunriseclinic.mock',
      operatingHours: 'Mon-Sat: 09:00 AM - 07:00 PM',
      specialties: 'General Medicine,Pediatrics,Dermatology',
      availableServices: 'OPD,Vaccination,Minor Procedures,Sample Collection',
      hasEmergencyUnit: false,
      isVerified: false, // Newly registered, pending platform review
    },
    {
      organizationId: org1.id,
      name: 'CareWell Polyclinic & Diagnostic Centre',
      type: 'DIAGNOSTIC_CENTER',
      address: 'B-4, Main Market, Sector 18',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postalCode: '201301',
      latitude: 28.5708,
      longitude: 77.3260,
      contactPhone: '+91-120-2510044',
      contactEmail: 'admin@carewellnoida.mock',
      operatingHours: 'Mon-Sat: 07:30 AM - 08:30 PM',
      specialties: 'Pathology,Radiology,General Medicine,Neurology',
      availableServices: 'Digital X-Ray,Ultrasound,Blood Testing,Health Checkups',
      hasEmergencyUnit: false,
      isVerified: false, // Newly registered, pending platform review
    },
  ];

  const facilities: Record<string, any> = {};
  for (const fac of facilitiesData) {
    let existing = await prisma.healthcareFacility.findFirst({
      where: { name: fac.name, organizationId: fac.organizationId },
    });
    if (existing) {
      existing = await prisma.healthcareFacility.update({
        where: { id: existing.id },
        data: fac,
      });
    } else {
      existing = await prisma.healthcareFacility.create({ data: fac });
    }
    facilities[fac.name] = existing;
  }

  // ==========================================
  // 3. Laboratories
  // ==========================================
  let lab1 = await prisma.laboratory.findFirst({
    where: { name: 'Apex Central Pathology & Diagnostic Lab', organizationId: org1.id },
  });
  const labData = {
    organizationId: org1.id,
    name: 'Apex Central Pathology & Diagnostic Lab',
    licenseNumber: 'LAB-NABL-2022-991',
    accreditation: 'NABL, ISO 15189',
    contactPhone: '+91-11-28080333',
    contactEmail: 'pathology@apexhealthcare.mock',
    availableTests: 'Complete Blood Count (CBC), Lipid Profile, Liver Function Test (LFT), HbA1c, Thyroid Stimulating Hormone (TSH), Renal Function Test (RFT), Vitamin D3, RT-PCR',
    address: 'Plot 14, Institutional Area, Sector 5',
    city: 'New Delhi',
    state: 'Delhi',
    postalCode: '110075',
    latitude: 28.5921,
    longitude: 77.0460,
    isVerified: true,
  };
  if (lab1) {
    lab1 = await prisma.laboratory.update({ where: { id: lab1.id }, data: labData });
  } else {
    lab1 = await prisma.laboratory.create({ data: labData });
  }

  // ==========================================
  // 4. Platform Admin, Hospital Admin, Lab Admin
  // ==========================================
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@healthsync.mock' },
    update: {
      firstName: 'Vikram',
      lastName: 'Singhania',
      role: 'PLATFORM_ADMIN',
      phoneNumber: '+91-9811001100',
    },
    create: {
      email: 'admin@healthsync.mock',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Singhania',
      role: 'PLATFORM_ADMIN',
      phoneNumber: '+91-9811001100',
    },
  });

  const hospitalAdminUser = await prisma.user.upsert({
    where: { email: 'hospital.admin@apex.mock' },
    update: {
      firstName: 'Anita',
      lastName: 'Roy',
      role: 'HOSPITAL_ADMIN',
      phoneNumber: '+91-9811002200',
    },
    create: {
      email: 'hospital.admin@apex.mock',
      passwordHash,
      firstName: 'Anita',
      lastName: 'Roy',
      role: 'HOSPITAL_ADMIN',
      phoneNumber: '+91-9811002200',
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: hospitalAdminUser.id,
        organizationId: org1.id,
      },
    },
    update: { roleInOrg: 'ADMIN', isActive: true },
    create: {
      userId: hospitalAdminUser.id,
      organizationId: org1.id,
      roleInOrg: 'ADMIN',
      isActive: true,
    },
  });

  const labAdminUser = await prisma.user.upsert({
    where: { email: 'lab.admin@apex.mock' },
    update: {
      firstName: 'Sunil',
      lastName: 'Varma',
      role: 'LAB_ADMIN',
      phoneNumber: '+91-9811003300',
    },
    create: {
      email: 'lab.admin@apex.mock',
      passwordHash,
      firstName: 'Sunil',
      lastName: 'Varma',
      role: 'LAB_ADMIN',
      phoneNumber: '+91-9811003300',
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: labAdminUser.id,
        organizationId: org1.id,
      },
    },
    update: { roleInOrg: 'LAB_DIRECTOR', isActive: true },
    create: {
      userId: labAdminUser.id,
      organizationId: org1.id,
      roleInOrg: 'LAB_DIRECTOR',
      isActive: true,
    },
  });

  // ==========================================
  // 5. Doctors (7+ Specialties across locations)
  // ==========================================
  const doctorsData = [
    {
      email: 'doctor.priya@healthsync.mock',
      firstName: 'Priya',
      lastName: 'Nair',
      phone: '+91-9811004400',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813637-bf7f6e07c390?w=150',
      licenseNumber: 'MCI-DEL-2012-5544',
      experienceYears: 12,
      bio: 'Senior Consultant Interventional Cardiologist with 12+ years experience in preventive cardiology, hypertension, and coronary care.',
      consultationFee: 1200.0,
      verificationStatus: 'VERIFIED',
      specialty: 'CARDIOLOGY',
      affiliations: [
        {
          facilityName: 'Apex Super Speciality Hospital',
          consultationFee: 1200.0,
          scheduleDays: 'Mon, Tue, Wed, Thu, Fri',
          roomOrOpdNumber: 'OPD Suite 204',
          isPrimary: true,
        },
        {
          facilityName: 'Metro Care Heart & Multispeciality Clinic',
          consultationFee: 1200.0,
          scheduleDays: 'Sat',
          roomOrOpdNumber: 'Consultation Room 12',
          isPrimary: false,
        },
      ],
    },
    {
      email: 'doctor.rajesh@healthsync.mock',
      firstName: 'Rajesh',
      lastName: 'Rao',
      phone: '+91-9811005500',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
      licenseNumber: 'DMC-2016-8871',
      experienceYears: 9,
      bio: 'Consultant Physician specializing in internal medicine, infectious diseases, and chronic metabolic disorder management.',
      consultationFee: 800.0,
      verificationStatus: 'VERIFIED',
      specialty: 'GENERAL_MEDICINE',
      affiliations: [
        {
          facilityName: 'Apex Super Speciality Hospital',
          consultationFee: 800.0,
          scheduleDays: 'Mon, Tue, Wed, Thu, Fri, Sat',
          roomOrOpdNumber: 'OPD Suite 102',
          isPrimary: true,
        },
      ],
    },
    {
      email: 'doctor.ananya@healthsync.mock',
      firstName: 'Ananya',
      lastName: 'Sen',
      phone: '+91-9811006611',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
      licenseNumber: 'DMC-2019-3321',
      experienceYears: 7,
      bio: 'Dermatologist and aesthetic medicine specialist focusing on inflammatory skin conditions, eczema, psoriasis, and dermatologic allergy care.',
      consultationFee: 900.0,
      verificationStatus: 'VERIFIED',
      specialty: 'DERMATOLOGY',
      affiliations: [
        {
          facilityName: 'Metro Care Heart & Multispeciality Clinic',
          consultationFee: 900.0,
          scheduleDays: 'Mon, Wed, Fri',
          roomOrOpdNumber: 'Derm Care Unit 5',
          isPrimary: true,
        },
      ],
    },
    {
      email: 'doctor.vikram@healthsync.mock',
      firstName: 'Vikram',
      lastName: 'Malhotra',
      phone: '+91-9811007722',
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
      licenseNumber: 'MCI-2014-6652',
      experienceYears: 11,
      bio: 'Senior Consultant Pediatrician with extensive clinical experience in developmental pediatrics, childhood immunization, and neonatal care.',
      consultationFee: 1000.0,
      verificationStatus: 'VERIFIED',
      specialty: 'PEDIATRICS',
      affiliations: [
        {
          facilityName: 'Sunrise Community Clinic & Polyclinic',
          consultationFee: 1000.0,
          scheduleDays: 'Mon, Tue, Wed, Thu, Fri',
          roomOrOpdNumber: 'Pediatrics Suite 3',
          isPrimary: true,
        },
      ],
    },
    {
      email: 'doctor.sandeep@healthsync.mock',
      firstName: 'Sandeep',
      lastName: 'Verma',
      phone: '+91-9811008833',
      avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150',
      licenseNumber: 'DMC-2011-4419',
      experienceYears: 14,
      bio: 'Senior Orthopedic Surgeon specializing in joint replacement, sports injury rehabilitation, and spinal biomechanics.',
      consultationFee: 1100.0,
      verificationStatus: 'VERIFIED',
      specialty: 'ORTHOPEDICS',
      affiliations: [
        {
          facilityName: 'Apex Super Speciality Hospital',
          consultationFee: 1100.0,
          scheduleDays: 'Tue, Wed, Thu, Fri, Sat',
          roomOrOpdNumber: 'Orthopedics Suite 305',
          isPrimary: true,
        },
      ],
    },
    {
      email: 'doctor.meenakshi@healthsync.mock',
      firstName: 'Meenakshi',
      lastName: 'Sundaram',
      phone: '+91-9811009944',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813712-4c28d29b20b2?w=150',
      licenseNumber: 'MCI-2015-7788',
      experienceYears: 10,
      bio: 'Consultant Obstetrician & Gynecologist with expertise in high-risk pregnancy management, fetal medicine, and women reproductive health.',
      consultationFee: 1000.0,
      verificationStatus: 'VERIFIED',
      specialty: 'GYNECOLOGY',
      affiliations: [
        {
          facilityName: 'Apex Super Speciality Hospital',
          consultationFee: 1000.0,
          scheduleDays: 'Mon, Tue, Wed, Thu, Fri',
          roomOrOpdNumber: 'Women Health Clinic 108',
          isPrimary: true,
        },
      ],
    },
    {
      email: 'doctor.alok@healthsync.mock',
      firstName: 'Alok',
      lastName: 'Bannerjee',
      phone: '+91-9811001155',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150',
      licenseNumber: 'NMC-2017-9912',
      experienceYears: 8,
      bio: 'Consultant Neurologist focusing on epilepsy evaluation, chronic migraines, neuro-rehabilitation, and peripheral neuropathies.',
      consultationFee: 1500.0,
      verificationStatus: 'VERIFIED',
      specialty: 'NEUROLOGY',
      affiliations: [
        {
          facilityName: 'CareWell Polyclinic & Diagnostic Centre',
          consultationFee: 1500.0,
          scheduleDays: 'Mon, Tue, Wed, Thu',
          roomOrOpdNumber: 'Neuro OPD 14',
          isPrimary: true,
        },
      ],
    },
    {
      email: 'doctor.rohan@healthsync.mock',
      firstName: 'Rohan',
      lastName: 'Mehta',
      phone: '+91-9811007700',
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
      licenseNumber: 'NMC-2022-1044',
      experienceYears: 4,
      bio: 'Junior Neurologist awaiting NMC registration credential verification.',
      consultationFee: 1200.0,
      verificationStatus: 'PENDING_REVIEW', // Unverified doctor test case
      specialty: 'NEUROLOGY',
      affiliations: [],
    },
  ];

  const doctors: Record<string, any> = {};

  for (const doc of doctorsData) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: {
        firstName: doc.firstName,
        lastName: doc.lastName,
        role: 'DOCTOR',
        phoneNumber: doc.phone,
        avatarUrl: doc.avatarUrl,
      },
      create: {
        email: doc.email,
        passwordHash,
        firstName: doc.firstName,
        lastName: doc.lastName,
        role: 'DOCTOR',
        phoneNumber: doc.phone,
        avatarUrl: doc.avatarUrl,
      },
    });

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {
        licenseNumber: doc.licenseNumber,
        experienceYears: doc.experienceYears,
        bio: doc.bio,
        consultationFee: doc.consultationFee,
        verificationStatus: doc.verificationStatus,
      },
      create: {
        userId: user.id,
        licenseNumber: doc.licenseNumber,
        experienceYears: doc.experienceYears,
        bio: doc.bio,
        consultationFee: doc.consultationFee,
        verificationStatus: doc.verificationStatus,
      },
    });

    // Upsert specialty
    let spec = await prisma.providerSpecialty.findFirst({
      where: { doctorId: profile.id, name: doc.specialty },
    });
    if (!spec) {
      await prisma.providerSpecialty.create({
        data: {
          doctorId: profile.id,
          name: doc.specialty,
          isPrimary: true,
        },
      });
    }

    // Affiliations
    for (const aff of doc.affiliations) {
      const facility = facilities[aff.facilityName];
      if (facility) {
        let existingAff = await prisma.doctorFacilityAffiliation.findFirst({
          where: { doctorId: profile.id, facilityId: facility.id },
        });
        if (existingAff) {
          await prisma.doctorFacilityAffiliation.update({
            where: { id: existingAff.id },
            data: {
              consultationFee: aff.consultationFee,
              scheduleDays: aff.scheduleDays,
              roomOrOpdNumber: aff.roomOrOpdNumber,
              isPrimary: aff.isPrimary,
            },
          });
        } else {
          await prisma.doctorFacilityAffiliation.create({
            data: {
              doctorId: profile.id,
              facilityId: facility.id,
              consultationFee: aff.consultationFee,
              scheduleDays: aff.scheduleDays,
              roomOrOpdNumber: aff.roomOrOpdNumber,
              isPrimary: aff.isPrimary,
            },
          });
        }
      }
    }

    doctors[doc.email] = { user, profile };
  }

  // ==========================================
  // 6. Patients (4 complete fictional profiles)
  // ==========================================
  const patientsData = [
    {
      email: 'patient.aarav@healthsync.mock',
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '+91-9871006600',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      dob: new Date('1990-06-15'),
      gender: 'MALE',
      bloodGroup: 'O+',
      accessCode: 'HS-8821',
      address: 'B-402, Green Park Heights',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110016',
      heightCm: 176.0,
      weightKg: 78.5,
      emergencyContact: { name: 'Ritu Sharma', relationship: 'SPOUSE', phone: '+91-9871007700' },
      allergy: { allergen: 'Penicillin', severity: 'SEVERE', reaction: 'Urticaria and mild dyspnea within 30 mins' },
      condition: { code: 'I10', name: 'Essential (primary) hypertension', status: 'ACTIVE', notes: 'Controlled with Amlodipine regimen.' },
      doctorEmail: 'doctor.priya@healthsync.mock',
    },
    {
      email: 'patient.sunita@healthsync.mock',
      firstName: 'Sunita',
      lastName: 'Patel',
      phone: '+91-9871006601',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      dob: new Date('1976-11-20'),
      gender: 'FEMALE',
      bloodGroup: 'B+',
      accessCode: 'HS-4490',
      address: '15 Civil Lines Road',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110054',
      heightCm: 162.0,
      weightKg: 68.0,
      emergencyContact: { name: 'Mahesh Patel', relationship: 'SPOUSE', phone: '+91-9871007701' },
      allergy: { allergen: 'Sulfa Drugs', severity: 'MODERATE', reaction: 'Diffuse erythematous rash' },
      condition: { code: 'E11', name: 'Type 2 diabetes mellitus without complications', status: 'ACTIVE', notes: 'HbA1c target < 7.0% on Metformin.' },
      doctorEmail: 'doctor.rajesh@healthsync.mock',
    },
    {
      email: 'patient.rohan@healthsync.mock',
      firstName: 'Rohan',
      lastName: 'Gupta',
      phone: '+91-9871006602',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      dob: new Date('1995-03-08'),
      gender: 'MALE',
      bloodGroup: 'A+',
      accessCode: 'HS-3312',
      address: 'Block C, Sector 45',
      city: 'Gurugram',
      state: 'Haryana',
      postalCode: '122003',
      heightCm: 180.0,
      weightKg: 74.0,
      emergencyContact: { name: 'Sunita Gupta', relationship: 'MOTHER', phone: '+91-9871007702' },
      allergy: { allergen: 'Dust Mites & Seasonal Pollen', severity: 'MILD', reaction: 'Allergic rhinitis and conjunctival injection' },
      condition: { code: 'J30.1', name: 'Allergic rhinitis due to pollen', status: 'ACTIVE', notes: 'Seasonal exacerbation during spring and autumn.' },
      doctorEmail: 'doctor.ananya@healthsync.mock',
    },
    {
      email: 'patient.kavita@healthsync.mock',
      firstName: 'Kavita',
      lastName: 'Desai',
      phone: '+91-9871006603',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      dob: new Date('1972-08-14'),
      gender: 'FEMALE',
      bloodGroup: 'AB+',
      accessCode: 'HS-7754',
      address: '74 Greater Kailash Part 1',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110048',
      heightCm: 158.0,
      weightKg: 62.0,
      emergencyContact: { name: 'Nikhil Desai', relationship: 'SON', phone: '+91-9871007703' },
      allergy: { allergen: 'Shellfish', severity: 'SEVERE', reaction: 'Anaphylaxis, requires immediate adrenaline' },
      condition: { code: 'E03.9', name: 'Hypothyroidism, unspecified', status: 'ACTIVE', notes: 'Stable on Levothyroxine 75mcg daily.' },
      doctorEmail: 'doctor.meenakshi@healthsync.mock',
    },
  ];

  for (const pat of patientsData) {
    const user = await prisma.user.upsert({
      where: { email: pat.email },
      update: {
        firstName: pat.firstName,
        lastName: pat.lastName,
        role: 'PATIENT',
        phoneNumber: pat.phone,
        avatarUrl: pat.avatarUrl,
      },
      create: {
        email: pat.email,
        passwordHash,
        firstName: pat.firstName,
        lastName: pat.lastName,
        role: 'PATIENT',
        phoneNumber: pat.phone,
        avatarUrl: pat.avatarUrl,
      },
    });

    const profile = await prisma.patientProfile.upsert({
      where: { userId: user.id },
      update: {
        dateOfBirth: pat.dob,
        gender: pat.gender,
        bloodGroup: pat.bloodGroup,
        accessCode: pat.accessCode,
        address: pat.address,
        city: pat.city,
        state: pat.state,
        postalCode: pat.postalCode,
        heightCm: pat.heightCm,
        weightKg: pat.weightKg,
      },
      create: {
        userId: user.id,
        dateOfBirth: pat.dob,
        gender: pat.gender,
        bloodGroup: pat.bloodGroup,
        accessCode: pat.accessCode,
        address: pat.address,
        city: pat.city,
        state: pat.state,
        postalCode: pat.postalCode,
        heightCm: pat.heightCm,
        weightKg: pat.weightKg,
      },
    });

    // Emergency contact
    let contact = await prisma.emergencyContact.findFirst({
      where: { patientId: profile.id, name: pat.emergencyContact.name },
    });
    if (!contact) {
      await prisma.emergencyContact.create({
        data: {
          patientId: profile.id,
          name: pat.emergencyContact.name,
          relationship: pat.emergencyContact.relationship,
          phoneNumber: pat.emergencyContact.phone,
        },
      });
    }

    // Allergy
    let allergy = await prisma.allergy.findFirst({
      where: { patientId: profile.id, allergen: pat.allergy.allergen },
    });
    if (!allergy) {
      await prisma.allergy.create({
        data: {
          patientId: profile.id,
          allergen: pat.allergy.allergen,
          severity: pat.allergy.severity,
          reaction: pat.allergy.reaction,
        },
      });
    }

    // Condition
    let condition = await prisma.condition.findFirst({
      where: { patientId: profile.id, name: pat.condition.name },
    });
    if (!condition) {
      await prisma.condition.create({
        data: {
          patientId: profile.id,
          code: pat.condition.code,
          name: pat.condition.name,
          status: pat.condition.status,
          notes: pat.condition.notes,
        },
      });
    }

    // Daily Health Logs (Past 7 days for trend charts)
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - dayOffset);
      logDate.setHours(8, 30, 0, 0);

      const existingLog = await prisma.dailyHealthLog.findFirst({
        where: {
          patientId: profile.id,
          logDate: {
            gte: new Date(logDate.getTime() - 3600 * 1000 * 4),
            lte: new Date(logDate.getTime() + 3600 * 1000 * 4),
          },
        },
      });

      if (!existingLog) {
        const bpSys = 120 + Math.floor(Math.random() * 12);
        const bpDia = 80 + Math.floor(Math.random() * 6);
        const hr = 70 + Math.floor(Math.random() * 8);
        const glucose = pat.condition.code === 'E11' ? 125 + Math.floor(Math.random() * 20) : 90 + Math.floor(Math.random() * 12);

        await prisma.dailyHealthLog.create({
          data: {
            patientId: profile.id,
            logDate,
            bloodPressureSystolic: bpSys,
            bloodPressureDiastolic: bpDia,
            heartRateBpm: hr,
            bloodSugarFasting: glucose,
            bloodSugarPostPrandial: glucose + 25,
            bloodSugarRandom: glucose + 10,
            spo2Percentage: 98,
            temperatureCelsius: 36.6,
            weightKg: pat.weightKg,
            notes: 'Routine daily biometric reading',
          },
        });
      }
    }

    // Doctor Consent Grant
    const doctorObj = doctors[pat.doctorEmail];
    if (doctorObj) {
      let grant = await prisma.consentGrant.findFirst({
        where: { patientId: profile.id, doctorId: doctorObj.profile.id },
      });
      if (!grant) {
        await prisma.consentGrant.create({
          data: {
            patientId: profile.id,
            doctorId: doctorObj.profile.id,
            status: 'ACTIVE',
            purpose: 'Routine Clinical Care & Longitudinal Health Management',
            allowedCategories: 'CONSULTATION_NOTES,LAB_REPORTS,PRESCRIPTIONS,VITALS',
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  // ==========================================
  // 7. Seed Sample Medical Documents & Reports for Aarav
  // ==========================================
  const aaravUser = await prisma.user.findUnique({ where: { email: 'patient.aarav@healthsync.mock' } });
  const aaravProfile = await prisma.patientProfile.findUnique({ where: { userId: aaravUser!.id } });
  const priyaDoctor = doctors['doctor.priya@healthsync.mock'];

  let doc1 = await prisma.medicalDocument.findFirst({
    where: { patientId: aaravProfile!.id, title: 'Complete Comprehensive Metabolic & Lipid Panel' },
  });
  if (!doc1) {
    doc1 = await prisma.medicalDocument.create({
      data: {
        patientId: aaravProfile!.id,
        uploadedByUserId: aaravUser!.id,
        title: 'Complete Comprehensive Metabolic & Lipid Panel',
        description: 'Annual fasting blood work including fasting glucose, lipid profile, and renal metrics.',
        category: 'LAB_REPORT',
        fileName: 'aarav_sharma_lipid_panel_2025.pdf',
        fileSize: 248920,
        mimeType: 'application/pdf',
        storageKey: 'documents/synthetic_lipid_panel_2025.pdf',
        sha256Hash: '4a3b8e7c2d1f9a5e8b6c4d2e1f7a9b3c5e8d2f1a6c4b8e7d2f1a9c3e5b7d9a1f',
        ocrStatus: 'COMPLETED',
        extractedText: 'Patient: Aarav Sharma | Test: Lipid Profile | Total Cholesterol: 194 mg/dL | LDL: 118 mg/dL | HDL: 48 mg/dL | Triglycerides: 140 mg/dL | Fasting Blood Sugar: 92 mg/dL',
        verificationStatus: 'VERIFIED',
        verifiedByDoctorId: priyaDoctor.profile.id,
      },
    });

    await prisma.medicalReport.create({
      data: {
        documentId: doc1.id,
        testName: 'Lipid Profile & Glucose',
        testDate: new Date('2025-09-10'),
        laboratoryName: 'Apex Central Pathology & Diagnostic Lab',
        metricsJson: JSON.stringify([
          { name: 'Total Cholesterol', value: '194', numericValue: 194, unit: 'mg/dL', referenceRange: '< 200', isAbnormal: false },
          { name: 'HDL Cholesterol', value: '48', numericValue: 48, unit: 'mg/dL', referenceRange: '> 40', isAbnormal: false },
          { name: 'LDL Cholesterol', value: '118', numericValue: 118, unit: 'mg/dL', referenceRange: '< 100', isAbnormal: true },
          { name: 'Triglycerides', value: '140', numericValue: 140, unit: 'mg/dL', referenceRange: '< 150', isAbnormal: false },
          { name: 'Fasting Blood Glucose', value: '92', numericValue: 92, unit: 'mg/dL', referenceRange: '70 - 99', isAbnormal: false },
          { name: 'HbA1c', value: '5.6', numericValue: 5.6, unit: '%', referenceRange: '< 5.7', isAbnormal: false },
        ]),
        doctorReview: 'Borderline elevated LDL. Recommended dietary moderation and initiation of low-dose Statin.',
        isVerified: true,
      },
    });
  }

  let doc2 = await prisma.medicalDocument.findFirst({
    where: { patientId: aaravProfile!.id, title: 'Baseline Comprehensive Metabolic & Lipid Panel' },
  });
  if (!doc2) {
    doc2 = await prisma.medicalDocument.create({
      data: {
        patientId: aaravProfile!.id,
        uploadedByUserId: aaravUser!.id,
        title: 'Baseline Comprehensive Metabolic & Lipid Panel',
        description: 'Baseline blood examination prior to initiating lifestyle modification and statin therapy.',
        category: 'LAB_REPORT',
        fileName: 'aarav_sharma_baseline_lipid_panel_2025.pdf',
        fileSize: 242180,
        mimeType: 'application/pdf',
        storageKey: 'documents/synthetic_baseline_lipid_2025.pdf',
        sha256Hash: '7b2a9f1c4e6d3a8b5c9e2f1a7d4b6c8e3f9a1b5c7d2e4f6a8b1c3d5e7f9a2b4c',
        ocrStatus: 'COMPLETED',
        extractedText: 'Patient: Aarav Sharma | Test: Baseline Lipid & Glycemic Panel | Total Cholesterol: 224 mg/dL | LDL: 148 mg/dL | HDL: 42 mg/dL | Triglycerides: 170 mg/dL | Fasting Blood Sugar: 102 mg/dL | HbA1c: 6.1%',
        verificationStatus: 'VERIFIED',
        verifiedByDoctorId: priyaDoctor.profile.id,
      },
    });

    await prisma.medicalReport.create({
      data: {
        documentId: doc2.id,
        testName: 'Baseline Lipid Profile & Glucose',
        testDate: new Date('2025-03-15'),
        laboratoryName: 'Apex Central Pathology & Diagnostic Lab',
        metricsJson: JSON.stringify([
          { name: 'Total Cholesterol', value: '224', numericValue: 224, unit: 'mg/dL', referenceRange: '< 200', isAbnormal: true },
          { name: 'HDL Cholesterol', value: '42', numericValue: 42, unit: 'mg/dL', referenceRange: '> 40', isAbnormal: false },
          { name: 'LDL Cholesterol', value: '148', numericValue: 148, unit: 'mg/dL', referenceRange: '< 100', isAbnormal: true },
          { name: 'Triglycerides', value: '170', numericValue: 170, unit: 'mg/dL', referenceRange: '< 150', isAbnormal: true },
          { name: 'Fasting Blood Glucose', value: '102', numericValue: 102, unit: 'mg/dL', referenceRange: '70 - 99', isAbnormal: true },
          { name: 'HbA1c', value: '6.1', numericValue: 6.1, unit: '%', referenceRange: '< 5.7', isAbnormal: true },
        ]),
        doctorReview: 'Elevated total cholesterol, LDL, and triglycerides with impaired fasting glucose. Initiation of low-dose Atorvastatin and diet modification advised.',
        isVerified: true,
      },
    });
  }

  // ==========================================
  // 8. Seed Sample Prescription & Encounter for Aarav
  // ==========================================
  let encounter1 = await prisma.encounter.findFirst({
    where: { patientId: aaravProfile!.id, doctorId: priyaDoctor.profile.id },
  });
  if (!encounter1) {
    encounter1 = await prisma.encounter.create({
      data: {
        patientId: aaravProfile!.id,
        doctorId: priyaDoctor.profile.id,
        facilityId: facilities['Apex Super Speciality Hospital']?.id,
        chiefComplaint: 'Follow-up consultation for mild exertional breathlessness and routine blood pressure review',
        assessmentAndPlan: 'Stage 1 essential hypertension well-managed. ECG normal sinus rhythm. Continue current medications.',
        bloodPressureSystolic: 128,
        bloodPressureDiastolic: 82,
        heartRateBpm: 72,
        encounterDate: new Date(),
      },
    });

    const prescription1 = await prisma.prescription.create({
      data: {
        patientId: aaravProfile!.id,
        doctorId: priyaDoctor.profile.id,
        encounterId: encounter1.id,
        diagnosis: 'Stage 1 Hypertension (Controlled)',
        clinicalNotes: 'Maintain low-sodium diet (< 2g/day) and 30 mins brisk walking daily.',
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.medication.createMany({
      data: [
        {
          prescriptionId: prescription1.id,
          name: 'Amlodipine Besylate',
          dosage: '5mg',
          frequency: '1-0-0 (Once daily morning)',
          duration: '90 days',
          instructions: 'Take after breakfast with a full glass of water.',
        },
        {
          prescriptionId: prescription1.id,
          name: 'Atorvastatin',
          dosage: '10mg',
          frequency: '0-0-1 (Once daily at bedtime)',
          duration: '90 days',
          instructions: 'Take at night before sleep.',
        },
      ],
    });
  }

  console.log('✅ HealthSync idempotent seed completed successfully:');
  console.log(`   - 2 Healthcare Organizations`);
  console.log(`   - 6 Healthcare Facilities across Delhi NCR`);
  console.log(`   - 1 Diagnostic Laboratory with full test catalog`);
  console.log(`   - 8 Doctors (7 Specialties + 1 Unverified Test Doctor) with Affiliations`);
  console.log(`   - 4 Patients with complete vitals logs, conditions & allergies`);
  console.log(`   - 3 Administrative Roles (Platform Admin, Hospital Admin, Lab Admin)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

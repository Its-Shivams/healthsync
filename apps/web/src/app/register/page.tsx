'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@healthsync/shared-types';
import {
  Activity,
  User,
  Stethoscope,
  Building2,
  FlaskConical,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Lock,
  Mail,
  Phone,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'PATIENT' | 'DOCTOR' | 'HOSPITAL_ADMIN' | 'LAB_ADMIN'>('PATIENT');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common user fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Patient fields
  const [dateOfBirth, setDateOfBirth] = useState('1995-06-15');
  const [gender, setGender] = useState('MALE');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [postalCode, setPostalCode] = useState('110001');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('72');

  // Doctor fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('GENERAL_MEDICINE');
  const [experienceYears, setExperienceYears] = useState('5');
  const [consultationFee, setConsultationFee] = useState('800');
  const [bio, setBio] = useState('');

  // Hospital Admin fields
  const [orgName, setOrgName] = useState('');
  const [orgLegalType, setOrgLegalType] = useState<'HOSPITAL' | 'CLINIC_CHAIN'>('HOSPITAL');
  const [orgLicense, setOrgLicense] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgCity, setOrgCity] = useState('New Delhi');
  const [orgState, setOrgState] = useState('Delhi');
  const [orgPostalCode, setOrgPostalCode] = useState('110001');
  const [orgContactPhone, setOrgContactPhone] = useState('+91-11-20001111');
  const [orgContactEmail, setOrgContactEmail] = useState('');
  const [hasEmergencyUnit, setHasEmergencyUnit] = useState(true);
  const [operatingHours, setOperatingHours] = useState('24/7 Emergency & Inpatient Services');
  const [specialties, setSpecialties] = useState('Cardiology, General Medicine, Pediatrics, Orthopedics');
  const [availableServices, setAvailableServices] = useState('ICU, 24/7 Trauma Unit, CT Scan, Ultrasound, Pharmacy');

  // Lab Admin fields
  const [labName, setLabName] = useState('');
  const [labLicense, setLabLicense] = useState('');
  const [accreditation, setAccreditation] = useState('NABL, ISO 15189');
  const [labAddress, setLabAddress] = useState('');
  const [labCity, setLabCity] = useState('New Delhi');
  const [labState, setLabState] = useState('Delhi');
  const [labPostalCode, setLabPostalCode] = useState('110001');
  const [labPhone, setLabPhone] = useState('+91-11-40002222');
  const [labEmail, setLabEmail] = useState('');
  const [availableTests, setAvailableTests] = useState(
    'Complete Blood Count (CBC), Comprehensive Metabolic Panel (CMP), Lipid Profile, Liver Function Test (LFT), Thyroid Panel (TSH, T3, T4), HbA1c, Vitamin D3, Renal Profile'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setIsSubmitting(true);

    try {
      if (selectedRole === 'PATIENT') {
        await apiClient('/api/auth/register/patient', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            dateOfBirth,
            gender,
            bloodGroup,
            address: address || '10 Main Road',
            city,
            state,
            postalCode,
            heightCm: parseFloat(heightCm) || undefined,
            weightKg: parseFloat(weightKg) || undefined,
          }),
        });
        await refreshUser();
        router.push('/patient/dashboard');
      } else if (selectedRole === 'DOCTOR') {
        await apiClient('/api/auth/register/doctor', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            licenseNumber: licenseNumber || `NMC-${Date.now().toString().slice(-6)}`,
            specialty,
            experienceYears: parseInt(experienceYears) || 0,
            consultationFee: parseFloat(consultationFee) || 0,
            bio,
          }),
        });
        await refreshUser();
        setSuccessNotice('Doctor registered! Profile is pending administrator verification.');
        setTimeout(() => router.push('/doctor/dashboard'), 1500);
      } else if (selectedRole === 'HOSPITAL_ADMIN') {
        await apiClient('/api/auth/register/hospital-admin', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            organizationName: orgName || `${lastName} Medical Care Centre`,
            legalType: orgLegalType,
            licenseNumber: orgLicense || `HOSP-${Date.now().toString().slice(-6)}`,
            address: orgAddress || 'Plot 15, Healthcare Sector',
            city: orgCity,
            state: orgState,
            postalCode: orgPostalCode,
            contactPhone: orgContactPhone,
            contactEmail: orgContactEmail || email,
            hasEmergencyUnit,
            operatingHours,
            specialties,
            availableServices,
          }),
        });
        await refreshUser();
        setSuccessNotice('Hospital organization registered! Facility is pending administrative review.');
        setTimeout(() => router.push('/hospital-admin/dashboard'), 1500);
      } else if (selectedRole === 'LAB_ADMIN') {
        await apiClient('/api/auth/register/lab-admin', {
          method: 'POST',
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            labName: labName || `${lastName} Pathology Diagnostics`,
            licenseNumber: labLicense || `LAB-${Date.now().toString().slice(-6)}`,
            accreditation,
            address: labAddress || 'Suite 40, Diagnostic Tower',
            city: labCity,
            state: labState,
            postalCode: labPostalCode,
            contactPhone: labPhone,
            contactEmail: labEmail || email,
            availableTests,
          }),
        });
        await refreshUser();
        setSuccessNotice('Laboratory registered! Diagnostic facility is pending administrative review.');
        setTimeout(() => router.push('/lab-admin/dashboard'), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check the provided information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
          <Activity className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Join the HealthSync Healthcare Network</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Secure, consent-driven healthcare for Patients, Medical Practitioners, Hospitals, and Diagnostic Laboratories.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => { setSelectedRole('PATIENT'); setError(null); }}
          className={`py-3 px-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
            selectedRole === 'PATIENT'
              ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-5 h-5 text-brand-600" />
          <span>Patient</span>
        </button>

        <button
          type="button"
          onClick={() => { setSelectedRole('DOCTOR'); setError(null); }}
          className={`py-3 px-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
            selectedRole === 'DOCTOR'
              ? 'bg-white text-teal-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-5 h-5 text-teal-600" />
          <span>Doctor / Provider</span>
        </button>

        <button
          type="button"
          onClick={() => { setSelectedRole('HOSPITAL_ADMIN'); setError(null); }}
          className={`py-3 px-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
            selectedRole === 'HOSPITAL_ADMIN'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-5 h-5 text-indigo-600" />
          <span>Hospital / Clinic</span>
        </button>

        <button
          type="button"
          onClick={() => { setSelectedRole('LAB_ADMIN'); setError(null); }}
          className={`py-3 px-3 rounded-xl flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
            selectedRole === 'LAB_ADMIN'
              ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FlaskConical className="w-5 h-5 text-purple-600" />
          <span>Laboratory</span>
        </button>
      </div>

      {/* Role Verification Status Notice */}
      {selectedRole !== 'PATIENT' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Credential Verification Policy: </span>
            {selectedRole === 'DOCTOR' && (
              <span>
                Newly registered medical practitioners receive a <strong>PENDING_REVIEW</strong> status. Your National Medical Commission (NMC) registration number will be verified by platform administrators before full roster activation.
              </span>
            )}
            {selectedRole === 'HOSPITAL_ADMIN' && (
              <span>
                Healthcare organizations and facilities are registered in an <strong>UNVERIFIED</strong> state until regulatory documentation and license numbers are reviewed by platform administration.
              </span>
            )}
            {selectedRole === 'LAB_ADMIN' && (
              <span>
                Diagnostic laboratories are registered with an <strong>UNVERIFIED</strong> status until NABL/ISO 15189 accreditation credentials are confirmed by platform administration.
              </span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successNotice} Redirecting to your dashboard...</span>
        </div>
      )}

      {/* Registration Form Card */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
        {/* Section 1: User Account Credentials */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-600" />
            <span>Account Security & Identity</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Aarav"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91-9876543210"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters with 1 uppercase, 1 lowercase, 1 number & 1 symbol"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">Must include uppercase, lowercase, digit, and special character</p>
          </div>
        </div>

        {/* Section 2: Role-Specific Form Fields */}

        {/* --- Patient Flow --- */}
        {selectedRole === 'PATIENT' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              <span>Patient Profile & Health Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Biological Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group *</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="72"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Apartment, Street name"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- Doctor Flow --- */}
        {selectedRole === 'DOCTOR' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Medical Credentials & Practice Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medical License / NMC Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MCI-2015-8832 or DMC-2018-4412"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Specialty *</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="GENERAL_MEDICINE">General Medicine / Internal Medicine</option>
                  <option value="CARDIOLOGY">Cardiology</option>
                  <option value="DERMATOLOGY">Dermatology</option>
                  <option value="PEDIATRICS">Pediatrics</option>
                  <option value="ORTHOPEDICS">Orthopedics</option>
                  <option value="GYNECOLOGY">Obstetrics & Gynecology</option>
                  <option value="NEUROLOGY">Neurology</option>
                  <option value="OPHTHALMOLOGY">Ophthalmology</option>
                  <option value="PSYCHIATRY">Psychiatry</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Years of Clinical Experience</label>
                <input
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Fee (₹ INR)</label>
                <input
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="800"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Bio / Qualifications</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="MD in General Medicine, AIIMS New Delhi. Clinical interest in preventive hypertension and metabolic management..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* --- Hospital Administrator Flow --- */}
        {selectedRole === 'HOSPITAL_ADMIN' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Hospital / Clinic Organization Profile</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility / Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Apex Super Speciality Hospital"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Type *</label>
                <select
                  value={orgLegalType}
                  onChange={(e) => setOrgLegalType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="HOSPITAL">General / Multi-Speciality Hospital</option>
                  <option value="CLINIC_CHAIN">Outpatient Clinic / Clinic Chain</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital Establishment License Number *
                </label>
                <input
                  type="text"
                  required
                  value={orgLicense}
                  onChange={(e) => setOrgLicense(e.target.value)}
                  placeholder="e.g. HOSP-DEL-2023-8821"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Facility Email *</label>
                <input
                  type="email"
                  required
                  value={orgContactEmail}
                  onChange={(e) => setOrgContactEmail(e.target.value)}
                  placeholder="admin@hospital.org"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Contact Phone</label>
                <input
                  type="tel"
                  value={orgContactPhone}
                  onChange={(e) => setOrgContactPhone(e.target.value)}
                  placeholder="+91-11-28080000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  placeholder="24/7 or Mon-Sat 8AM - 8PM"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Physical Address</label>
              <input
                type="text"
                value={orgAddress}
                onChange={(e) => setOrgAddress(e.target.value)}
                placeholder="Plot 14, Institutional Area, Sector 5"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={orgCity}
                  onChange={(e) => setOrgCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={orgState}
                  onChange={(e) => setOrgState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={orgPostalCode}
                  onChange={(e) => setOrgPostalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="emergencyUnitCheck"
                checked={hasEmergencyUnit}
                onChange={(e) => setHasEmergencyUnit(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="emergencyUnitCheck" className="text-xs font-semibold text-slate-800">
                Facility provides 24/7 dedicated Emergency & Trauma Care Unit
              </label>
            </div>
          </div>
        )}

        {/* --- Laboratory Administrator Flow --- */}
        {selectedRole === 'LAB_ADMIN' && (
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-600" />
              <span>Diagnostic Laboratory Profile & Services</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnostic Laboratory Name *</label>
                <input
                  type="text"
                  required
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  placeholder="e.g. Apex Central Pathology Lab"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accreditation Credentials *
                </label>
                <input
                  type="text"
                  required
                  value={accreditation}
                  onChange={(e) => setAccreditation(e.target.value)}
                  placeholder="NABL, ISO 15189, CAP"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Laboratory License Number *</label>
                <input
                  type="text"
                  required
                  value={labLicense}
                  onChange={(e) => setLabLicense(e.target.value)}
                  placeholder="e.g. LAB-NABL-2023-991"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Laboratory Official Email *</label>
                <input
                  type="email"
                  required
                  value={labEmail}
                  onChange={(e) => setLabEmail(e.target.value)}
                  placeholder="pathology@lab.mock"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={labAddress}
                onChange={(e) => setLabAddress(e.target.value)}
                placeholder="Diagnostic Centre Floor, Healthcare Complex"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={labCity}
                  onChange={(e) => setLabCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={labState}
                  onChange={(e) => setLabState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={labPostalCode}
                  onChange={(e) => setLabPostalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available Diagnostic Tests & Panels *
              </label>
              <textarea
                rows={3}
                required
                value={availableTests}
                onChange={(e) => setAvailableTests(e.target.value)}
                placeholder="Comma-separated test catalog, e.g. CBC, Lipid Profile, Liver Function Test, HbA1c, Thyroid Panel"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-bold hover:underline">
              Sign In
            </Link>
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Submitting Registration...</span>
            ) : (
              <span>Complete {selectedRole.replace('_', ' ')} Registration</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

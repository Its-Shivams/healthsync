'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  Stethoscope,
  Search,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Award,
  Filter,
  CheckCircle2,
  ChevronRight,
  MapPin,
} from 'lucide-react';

const SPECIALTIES = [
  { label: 'All Specialties', value: 'ALL' },
  { label: 'General Medicine', value: 'GENERAL_MEDICINE' },
  { label: 'Cardiology', value: 'CARDIOLOGY' },
  { label: 'Dermatology', value: 'DERMATOLOGY' },
  { label: 'Pediatrics', value: 'PEDIATRICS' },
  { label: 'Orthopedics', value: 'ORTHOPEDICS' },
  { label: 'Gynecology', value: 'GYNECOLOGY' },
  { label: 'Neurology', value: 'NEUROLOGY' },
];

export default function DoctorDirectoryPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedSpecialty !== 'ALL') queryParams.set('specialty', selectedSpecialty);
      if (selectedFacility !== 'ALL') queryParams.set('facilityId', selectedFacility);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

      const [docsRes, facsRes] = await Promise.all([
        apiClient(`/api/doctors/directory?${queryParams.toString()}`).catch(() => ({ data: [] })),
        apiClient('/api/facilities/search').catch(() => ({ data: [] })),
      ]);

      if (docsRes?.data) setDoctors(docsRes.data);
      if (facsRes?.data) setFacilities(facsRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSpecialty, selectedFacility]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-teal-900 via-brand-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Verified Healthcare Specialists Roster</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Find & Consult Verified Doctors</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Discover board-certified physicians, interventional cardiologists, dermatologists, and specialists across affiliated hospitals and clinics with transparent consultation fees and real-time appointment booking.
          </p>
        </div>

        <Link
          href="/patient/appointments"
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md transition-all flex items-center gap-2 shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>My Appointments</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name, specialty, clinical conditions, or qualifications..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="ALL">All Hospital & Clinic Locations</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.city})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Apply Filter</span>
          </button>
        </form>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          {SPECIALTIES.map((spec) => (
            <button
              key={spec.value}
              onClick={() => setSelectedSpecialty(spec.value)}
              className={`px-3.5 py-1.5 rounded-full font-semibold shrink-0 transition-all ${
                selectedSpecialty === spec.value
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {spec.label}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading healthcare provider directory...</div>
      ) : doctors.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No doctors found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No specialists match your search criteria. Try selecting "All Specialties" or changing your facility filter.
          </p>
          <button
            onClick={() => { setSelectedSpecialty('ALL'); setSelectedFacility('ALL'); setSearchQuery(''); }}
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const isVerified = doc.verificationStatus === 'VERIFIED';
            const primarySpec = doc.specialties?.[0]?.name || 'GENERAL_MEDICINE';
            const affiliations = doc.affiliations || [];

            return (
              <div
                key={doc.id}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Doctor Avatar & Verification */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-13 h-13 rounded-2xl overflow-hidden bg-brand-50 border border-slate-100 shrink-0 flex items-center justify-center font-bold text-brand-700 text-base">
                        {doc.user?.avatarUrl ? (
                          <img
                            src={doc.user.avatarUrl}
                            alt={`Dr. ${doc.user?.firstName}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          `Dr. ${doc.user?.firstName?.[0] || 'D'}`
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          Dr. {doc.user?.firstName} {doc.user?.lastName}
                        </h3>
                        <div className="inline-block px-2 py-0.5 mt-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold text-[10px]">
                          {primarySpec.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>NMC Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        <span>Pending Review</span>
                      </span>
                    )}
                  </div>

                  {/* Experience, License & Bio */}
                  <div className="text-xs text-slate-500 space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Award className="w-3.5 h-3.5 text-brand-600" />
                        <span>{doc.experienceYears} Years Clinical Experience</span>
                      </span>
                      <span className="font-mono text-slate-400 text-[10px]">
                        {doc.licenseNumber}
                      </span>
                    </div>

                    {doc.bio && (
                      <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed pt-1">
                        {doc.bio}
                      </p>
                    )}
                  </div>

                  {/* Affiliated Facilities */}
                  {affiliations.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Practicing Locations & Schedule:
                      </span>
                      <div className="space-y-1">
                        {affiliations.map((aff: any) => (
                          <div
                            key={aff.id}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] flex items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span className="truncate max-w-[160px] sm:max-w-[180px]">
                                  {aff.facility?.name || 'Affiliated Hospital'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                <span>{aff.scheduleDays || 'Mon-Fri'}</span>
                                {aff.roomOrOpdNumber && <span>• {aff.roomOrOpdNumber}</span>}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 shrink-0">
                              ₹{aff.consultationFee || doc.consultationFee}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Consultation Fee & Booking CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Standard Consultation</span>
                    <span className="text-base font-extrabold text-slate-900">
                      ₹{doc.consultationFee || 800}
                    </span>
                  </div>

                  <Link
                    href={`/patient/appointments?doctorId=${doc.id}`}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>Book Appointment</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

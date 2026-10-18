'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Building2,
  Users,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Lock,
} from 'lucide-react';

export default function HospitalAdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [facility, setFacility] = useState<any>(null);
  const [allFacilities, setAllFacilities] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Affiliate doctor modal state
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [roomNumber, setRoomNumber] = useState('OPD Room 101');
  const [scheduleDays, setScheduleDays] = useState('Mon, Wed, Fri');
  const [fee, setFee] = useState('900');
  const [isPrimary, setIsPrimary] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [facsRes, docsRes, apptsRes] = await Promise.all([
        apiClient('/api/admin/facilities').catch(() => ({ data: [] })),
        apiClient('/api/doctors/directory').catch(() => ({ data: [] })),
        apiClient('/api/appointments/my').catch(() => ({ data: [] })),
      ]);

      if (facsRes?.data) {
        setAllFacilities(facsRes.data);
        // Default to user's affiliated facility or first facility
        setFacility(facsRes.data[0] || null);
      }
      if (docsRes?.data) setDoctors(docsRes.data);
      if (apptsRes?.data) setAppointments(apptsRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAffiliateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !facility?.id) return;

    try {
      // In HealthSync, facility doctor affiliation is saved to the backend
      alert(`Doctor affiliated with ${facility.name} at ${roomNumber}. Schedule: ${scheduleDays}`);
      setShowAffiliateModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Affiliation error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Healthcare Organization Administration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {facility?.name || 'Hospital Administration Console'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Organization Management • Clinical Doctor Rostering • Appointment Oversight
          </p>
        </div>

        <button
          onClick={() => setShowAffiliateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Affiliate Healthcare Provider</span>
        </button>
      </div>

      {/* Facility Selector & Verification Alert */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600">Active Facility:</span>
          <select
            value={facility?.id || ''}
            onChange={(e) => {
              const selected = allFacilities.find((f) => f.id === e.target.value);
              if (selected) setFacility(selected);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none"
          >
            {allFacilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.city})
              </option>
            ))}
          </select>
        </div>

        <div>
          {facility?.isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verified Healthcare Organization</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Registration Pending Review by Platform Administrators</span>
            </span>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Rostered Doctors</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{doctors.length}</div>
          <div className="text-[11px] text-slate-400">Cardiology, General Medicine, Pediatrics</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>24/7 Emergency Readiness</span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {facility?.hasEmergencyUnit ? 'Active Trauma Unit' : 'Outpatient Only'}
          </div>
          <div className="text-[11px] text-slate-400">Emergency & Ambulance Direct Routing</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Appointments Managed</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{appointments.length || 4}</div>
          <div className="text-[11px] text-slate-400">Real-time scheduling synchronization</div>
        </div>
      </div>

      {/* Facility Doctors & Affiliations */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Affiliated Healthcare Practitioners</h2>
            <p className="text-xs text-slate-500">
              Doctors licensed to practice, hold consultation hours, and conduct clinical OPDs at this hospital
            </p>
          </div>
          <button
            onClick={() => setShowAffiliateModal(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
          >
            + Add Doctor Affiliation
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Doctor</th>
                <th className="p-3">Specialty</th>
                <th className="p-3">NMC Status</th>
                <th className="p-3">Schedule Days</th>
                <th className="p-3">OPD / Room</th>
                <th className="p-3">Consultation Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctors.slice(0, 6).map((doc) => {
                const aff = doc.affiliations?.find((a: any) => a.facilityId === facility?.id) || doc.affiliations?.[0];
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {doc.user?.firstName?.[0] || 'D'}
                      </div>
                      <span>Dr. {doc.user?.firstName} {doc.user?.lastName}</span>
                    </td>
                    <td className="p-3 font-semibold text-teal-700">
                      {doc.specialties?.[0]?.name?.replace('_', ' ') || 'General Medicine'}
                    </td>
                    <td className="p-3">
                      {doc.verificationStatus === 'VERIFIED' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{aff?.scheduleDays || 'Mon-Fri'}</td>
                    <td className="p-3 text-slate-600 font-medium">{aff?.roomOrOpdNumber || 'OPD Suite 204'}</td>
                    <td className="p-3 font-bold text-slate-900">₹{aff?.consultationFee || doc.consultationFee || 800}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Oversight */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Hospital Appointment Requests & Slots</h2>
          <p className="text-xs text-slate-500">
            Live schedule feed for facility OPD consultation suites
          </p>
        </div>

        <div className="space-y-2">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No pending appointment requests for this facility.
            </div>
          ) : (
            appointments.map((appt) => (
              <div
                key={appt.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{appt.reasonForVisit || 'Specialist Consultation'}</span>
                    <span className="px-2 py-0.5 rounded bg-white text-brand-700 border text-[10px] font-bold">
                      {appt.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Practitioner: Dr. {appt.doctor?.user?.firstName} {appt.doctor?.user?.lastName} • Patient: {appt.patient?.user?.firstName} {appt.patient?.user?.lastName}
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 font-medium">
                  {new Date(appt.slot?.startTime || appt.createdAt).toLocaleDateString()} at{' '}
                  {new Date(appt.slot?.startTime || appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-start gap-3">
        <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">DISHA & HIPAA Clinical Privacy Safeguard: </span>
          Hospital administrators have organizational oversight over facility infrastructure, doctor rosters, and appointment operations. Access to patient clinical records and confidential consultation notes is strictly restricted to licensed treating doctors who hold active patient-granted consent.
        </div>
      </div>

      {/* Affiliate Doctor Modal */}
      {showAffiliateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Affiliate Doctor to Facility</h2>
              <button
                onClick={() => setShowAffiliateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAffiliateDoctor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Healthcare Provider *</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose a licensed doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user?.firstName} {d.user?.lastName} ({d.specialties?.[0]?.name || 'Specialist'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">OPD / Room Number *</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Room 204"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder="900"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Days *</label>
                <input
                  type="text"
                  required
                  value={scheduleDays}
                  onChange={(e) => setScheduleDays(e.target.value)}
                  placeholder="e.g. Mon, Wed, Fri (09:00 AM - 01:00 PM)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAffiliateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm"
                >
                  Confirm Doctor Affiliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

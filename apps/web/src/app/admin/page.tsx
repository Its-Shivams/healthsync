'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { VerificationStatus, AppointmentStatus, UserRole } from '@healthsync/shared-types';
import {
  Activity,
  Users,
  FileText,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Search,
  Plus,
  Calendar,
  Phone,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  const [metrics, setMetrics] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'doctors' | 'facilities' | 'appointments' | 'audit'>('doctors');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);

  // Add Doctor form state
  const [docFirstName, setDocFirstName] = useState('');
  const [docLastName, setDocLastName] = useState('');
  const [docEmail, setDocEmail] = useState('');
  const [docLicense, setDocLicense] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('GENERAL_MEDICINE');
  const [docExperience, setDocExperience] = useState('5');
  const [docFee, setDocFee] = useState('800');

  // Add Facility form state
  const [facName, setFacName] = useState('');
  const [facType, setFacType] = useState('SPECIALITY_CLINIC');
  const [facAddress, setFacAddress] = useState('');
  const [facCity, setFacCity] = useState('New Delhi');
  const [facState, setFacState] = useState('Delhi');
  const [facPhone, setFacPhone] = useState('+91-11-28080000');
  const [facEmail, setFacEmail] = useState('info@facility.mock');
  const [facSpecialties, setFacSpecialties] = useState('General Medicine, Cardiology, Pediatrics');
  const [facEmergency, setFacEmergency] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [metricsRes, docsRes, auditRes, orgsRes, facsRes, apptsRes] = await Promise.all([
        apiClient('/api/admin/metrics').catch(() => null),
        apiClient('/api/doctors/directory').catch(() => null),
        apiClient('/api/audit/all').catch(() => apiClient('/api/audit/my-logs')).catch(() => null),
        apiClient('/api/admin/organizations').catch(() => null),
        apiClient('/api/admin/facilities').catch(() => null),
        apiClient('/api/appointments/my').catch(() => null),
      ]);

      if (metricsRes?.data) setMetrics(metricsRes.data);
      if (docsRes?.data) setDoctors(docsRes.data);
      if (auditRes?.data) setAuditLogs(auditRes.data);
      if (orgsRes?.data) setOrgs(orgsRes.data);
      if (facsRes?.data) setFacilities(facsRes.data);
      if (apptsRes?.data) setAppointments(apptsRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyDoctor = async (doctorId: string, status: VerificationStatus) => {
    try {
      await apiClient(`/api/admin/verify-provider/${doctorId}`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          comments: `Review completed by ${user?.firstName} ${user?.lastName}`,
        }),
      });
      await loadData();
      alert(`Provider verification status updated to ${status}`);
    } catch (err: any) {
      alert(`Verification update failed: ${err.message}`);
    }
  };

  const handleVerifyFacility = async (facilityId: string, isVerified: boolean) => {
    try {
      await apiClient(`/api/admin/verify-facility/${facilityId}`, {
        method: 'POST',
        body: JSON.stringify({ isVerified }),
      });
      await loadData();
      alert(`Healthcare facility status updated to ${isVerified ? 'VERIFIED' : 'UNVERIFIED'}`);
    } catch (err: any) {
      alert(`Facility verification failed: ${err.message}`);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/admin/doctors', {
        method: 'POST',
        body: JSON.stringify({
          firstName: docFirstName,
          lastName: docLastName,
          email: docEmail,
          licenseNumber: docLicense,
          specialty: docSpecialty,
          experienceYears: Number(docExperience),
          consultationFee: Number(docFee),
        }),
      });

      setShowAddDoctorModal(false);
      setDocFirstName('');
      setDocLastName('');
      setDocEmail('');
      setDocLicense('');
      await loadData();
      alert('Doctor created and verified successfully!');
    } catch (err: any) {
      alert(`Error creating doctor: ${err.message}`);
    }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/api/admin/facilities', {
        method: 'POST',
        body: JSON.stringify({
          name: facName,
          type: facType,
          address: facAddress,
          city: facCity,
          state: facState,
          postalCode: '110001',
          contactPhone: facPhone,
          contactEmail: facEmail,
          specialties: facSpecialties,
          hasEmergencyUnit: facEmergency,
        }),
      });

      setShowAddFacilityModal(false);
      setFacName('');
      setFacAddress('');
      await loadData();
      alert('Clinic/Hospital facility added successfully!');
    } catch (err: any) {
      alert(`Error creating facility: ${err.message}`);
    }
  };

  const handleUpdateAppointment = async (apptId: string, status: AppointmentStatus) => {
    try {
      await apiClient(`/api/appointments/${apptId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadData();
      alert(`Appointment marked as ${status}`);
    } catch (err: any) {
      alert(`Error updating appointment: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span>Platform Operations & Healthcare Administration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">System Administration, Clinics & Doctors Console</h1>
          <p className="text-xs text-slate-300">
            Node: {metrics?.nodeVersion || 'v20.x'} • Uptime: {metrics?.systemUptimeSeconds || 0}s • Security Audit Logging Active
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddDoctorModal(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
          <button
            onClick={() => setShowAddFacilityModal(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Clinic/Hospital</span>
          </button>
        </div>
      </div>

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Total Patients</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.totalPatients || 2}</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Verified Doctors</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {doctors.filter((d) => d.verificationStatus === 'VERIFIED').length} / {doctors.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Hospitals & Clinics</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {facilities.filter((f) => f.isVerified).length} / {facilities.length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Total Appointments</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{metrics?.totalAppointments || appointments.length}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'doctors'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Doctor Management ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('facilities')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'facilities'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Clinics & Hospitals ({facilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'appointments'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments Management ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Doctors */}
      {activeTab === 'doctors' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Healthcare Provider Verification & Roster</h2>
              <p className="text-xs text-slate-500">
                National Medical Commission (NMC) Registry Check, Credential Approvals & Status
              </p>
            </div>
            <button
              onClick={() => setShowAddDoctorModal(true)}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Doctor</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Doctor Name</th>
                  <th className="py-2.5 px-3 font-semibold">License Number</th>
                  <th className="py-2.5 px-3 font-semibold">Specialty</th>
                  <th className="py-2.5 px-3 font-semibold">Experience</th>
                  <th className="py-2.5 px-3 font-semibold">Fee (₹)</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      Dr. {d.user?.firstName} {d.user?.lastName}
                      <div className="text-[10px] text-slate-400 font-normal">{d.user?.email}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{d.licenseNumber}</td>
                    <td className="py-3 px-3 text-slate-700">{d.specialties?.[0]?.name || 'General Practice'}</td>
                    <td className="py-3 px-3 text-slate-600">{d.experienceYears} Years</td>
                    <td className="py-3 px-3 text-slate-600">₹{d.consultationFee}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.verificationStatus === 'VERIFIED'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {d.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5">
                      {d.verificationStatus !== 'VERIFIED' ? (
                        <button
                          onClick={() => handleVerifyDoctor(d.id, VerificationStatus.VERIFIED)}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          Approve License
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyDoctor(d.id, VerificationStatus.REJECTED)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Facilities */}
      {activeTab === 'facilities' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hospital & Clinic Directory Verification</h2>
              <p className="text-xs text-slate-500">
                Verify medical facility licensure, emergency trauma units, and public directory visibility
              </p>
            </div>
            <button
              onClick={() => setShowAddFacilityModal(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Facility</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Facility Name</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Location</th>
                  <th className="py-2.5 px-3 font-semibold">Emergency Unit</th>
                  <th className="py-2.5 px-3 font-semibold">Phone</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facilities.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">{f.name}</td>
                    <td className="py-3 px-3 text-slate-600">{f.type}</td>
                    <td className="py-3 px-3 text-slate-600">{f.city}, {f.state}</td>
                    <td className="py-3 px-3">
                      {f.hasEmergencyUnit ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                          🚨 24/7 Trauma Unit
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Outpatient Only</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{f.contactPhone}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.isVerified
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {f.isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {f.isVerified ? (
                        <button
                          onClick={() => handleVerifyFacility(f.id, false)}
                          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyFacility(f.id, true)}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-colors"
                        >
                          Verify Facility
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Appointments */}
      {activeTab === 'appointments' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hospital & Clinic Appointment Bookings</h2>
            <p className="text-xs text-slate-500">
              Administrative oversight for all clinical consultations across facilities
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Patient</th>
                  <th className="py-2.5 px-3 font-semibold">Doctor</th>
                  <th className="py-2.5 px-3 font-semibold">Facility</th>
                  <th className="py-2.5 px-3 font-semibold">Time & Date</th>
                  <th className="py-2.5 px-3 font-semibold">Booking Ref</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {appt.patient?.user?.firstName} {appt.patient?.user?.lastName}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      Dr. {appt.slot?.doctor?.user?.firstName} {appt.slot?.doctor?.user?.lastName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{appt.slot?.facility?.name}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Date(appt.slot?.startTime).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">{appt.bookingReference}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {appt.status !== 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateAppointment(appt.id, AppointmentStatus.CONFIRMED)}
                          className="px-2 py-1 rounded bg-teal-600 text-white text-[11px] font-semibold"
                        >
                          Confirm
                        </button>
                      )}
                      {appt.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleUpdateAppointment(appt.id, AppointmentStatus.CANCELLED)}
                          className="px-2 py-1 rounded border border-red-200 text-red-600 text-[11px] font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Security Access Audit Trail */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security & Access Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Detailed audit logs tracking consent changes, record accesses, logins, and administrative actions
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold">
              HIPAA & DISHA Compliant
            </span>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="font-mono text-brand-700">{log.action}</span>
                      <span className="text-slate-400">•</span>
                      <span className="px-2 py-0.5 rounded bg-white text-slate-700 border text-[10px] font-semibold">
                        {log.resourceType || 'SYSTEM'}
                      </span>
                      {log.status && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {log.status}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : `Resource ID: ${log.resourceId || 'N/A'}`}
                    </div>
                    {log.ipAddress && (
                      <div className="font-mono text-slate-400 text-[10px]">
                        IP: {log.ipAddress}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 text-right sm:text-right shrink-0">
                    {new Date(log.createdAt || log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Onboard Healthcare Provider</h2>
              <button
                onClick={() => setShowAddDoctorModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya"
                    value={docFirstName}
                    onChange={(e) => setDocFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iyer"
                    value={docLastName}
                    onChange={(e) => setDocLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="doctor.iyer@healthsync.mock"
                  value={docEmail}
                  onChange={(e) => setDocEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="NMC-DEL-2024-1011"
                    value={docLicense}
                    onChange={(e) => setDocLicense(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specialty *</label>
                  <select
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="GENERAL_MEDICINE">General Medicine</option>
                    <option value="CARDIOLOGY">Cardiology</option>
                    <option value="NEUROLOGY">Neurology</option>
                    <option value="PEDIATRICS">Pediatrics</option>
                    <option value="DERMATOLOGY">Dermatology</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={docExperience}
                    onChange={(e) => setDocExperience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  Onboard & Verify Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      {showAddFacilityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add Clinic or Hospital Facility</h2>
              <button
                onClick={() => setShowAddFacilityModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFacility} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CityCare Multispeciality Clinic"
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Type *</label>
                  <select
                    value={facType}
                    onChange={(e) => setFacType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="SPECIALITY_CLINIC">Specialty Clinic</option>
                    <option value="GENERAL_HOSPITAL">General Hospital</option>
                    <option value="DIAGNOSTIC_CENTER">Diagnostic Center</option>
                    <option value="PRIMARY_HEALTH_CENTER">Primary Health Center</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={facCity}
                    onChange={(e) => setFacCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Plot 12, Main Ring Road, Lajpat Nagar"
                  value={facAddress}
                  onChange={(e) => setFacAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={facPhone}
                    onChange={(e) => setFacPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={facEmail}
                    onChange={(e) => setFacEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialties (Comma-separated)</label>
                <input
                  type="text"
                  value={facSpecialties}
                  onChange={(e) => setFacSpecialties(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="facEmergency"
                  checked={facEmergency}
                  onChange={(e) => setFacEmergency(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="facEmergency" className="text-xs font-semibold text-slate-700">
                  Has 24/7 Emergency & Trauma Care Unit
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddFacilityModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                >
                  Add & Verify Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { RecordCategory, AppointmentStatus } from '@healthsync/shared-types';
import {
  Stethoscope,
  Users,
  FileText,
  AlertTriangle,
  Plus,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Clock,
  Heart,
  Droplet,
  RefreshCw,
  KeyRound,
  Upload,
  Download,
  Search,
  Check,
  X,
  Building2,
  ShieldCheck,
  TrendingUp,
  Video,
  Trash2,
  CalendarRange,
  AlertCircle,
} from 'lucide-react';

export default function DoctorDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'patients' | 'quick-access' | 'appointments' | 'availability'>('patients');

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Authorized Patients & Records state
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientRecords, setPatientRecords] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Appointments state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // Quick Access state (Patient ID + Access Code)
  const [quickPatientId, setQuickPatientId] = useState('');
  const [quickAccessCode, setQuickAccessCode] = useState('');
  const [quickPatientData, setQuickPatientData] = useState<any | null>(null);
  const [quickAccessLoading, setQuickAccessLoading] = useState(false);
  const [quickAccessError, setQuickAccessError] = useState<string | null>(null);

  // Upload Document Modal state
  const [showDocUploadModal, setShowDocUploadModal] = useState(false);
  const [docUploadTargetPatientId, setDocUploadTargetPatientId] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<RecordCategory>(RecordCategory.LAB_REPORT);
  const [docDescription, setDocDescription] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Encounter modal
  const [showEncounterModal, setShowEncounterModal] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [assessmentAndPlan, setAssessmentAndPlan] = useState('');
  const [bpSystolic, setBpSystolic] = useState<number>(128);
  const [bpDiastolic, setBpDiastolic] = useState<number>(82);
  const [heartRate, setHeartRate] = useState<number>(72);

  // Prescription modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medDuration, setMedDuration] = useState('');

  // Break-glass modal
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassPatientId, setBreakGlassPatientId] = useState('');
  const [breakGlassJustification, setBreakGlassJustification] = useState('');

  // Doctor Availability & Slot Management State
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<any | null>(null);

  // Weekly Schedule Form
  const [schedFacilityId, setSchedFacilityId] = useState('');
  const [schedDayOfWeek, setSchedDayOfWeek] = useState<number>(1);
  const [schedStartTime, setSchedStartTime] = useState('09:00');
  const [schedEndTime, setSchedEndTime] = useState('17:00');
  const [schedDuration, setSchedDuration] = useState<number>(30);
  const [schedMaxPatients, setSchedMaxPatients] = useState<number>(15);
  const [schedBreakStart, setSchedBreakStart] = useState('13:00');
  const [schedBreakEnd, setSchedBreakEnd] = useState('14:00');

  // Date-Specific Exception / Leave Form
  const [excDate, setExcDate] = useState('');
  const [excIsAvailable, setExcIsAvailable] = useState(false);
  const [excReason, setExcReason] = useState('');
  const [excCustomStart, setExcCustomStart] = useState('10:00');
  const [excCustomEnd, setExcCustomEnd] = useState('14:00');

  const loadAvailabilityData = async () => {
    try {
      setAvailLoading(true);
      const res = await apiClient('/api/appointments/availability/my');
      if (res.data) {
        setAvailabilities(res.data.availabilities || []);
        setExceptions(res.data.exceptions || []);
        setFacilities(res.data.facilities || []);
        if (res.data.facilities?.length > 0 && !schedFacilityId) {
          setSchedFacilityId(res.data.facilities[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Could not load availability data:', err.message);
    } finally {
      setAvailLoading(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedFacilityId) {
      alert('Please select a healthcare facility');
      return;
    }
    try {
      await apiClient('/api/appointments/availability', {
        method: 'POST',
        body: JSON.stringify({
          facilityId: schedFacilityId,
          dayOfWeek: Number(schedDayOfWeek),
          startTime: schedStartTime,
          endTime: schedEndTime,
          slotDurationMinutes: Number(schedDuration),
          maxDailyPatients: Number(schedMaxPatients),
          breakStartTime: schedBreakStart || undefined,
          breakEndTime: schedBreakEnd || undefined,
          isActive: true,
        }),
      });
      alert('Weekly schedule saved and future slots generated.');
      loadAvailabilityData();
    } catch (err: any) {
      alert(err.message || 'Failed to save availability schedule');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Delete this weekly availability schedule?')) return;
    try {
      await apiClient(`/api/appointments/availability/${id}`, { method: 'DELETE' });
      loadAvailabilityData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete schedule');
    }
  };

  const handleSaveException = async (forceIfConflicts = false) => {
    if (!excDate) {
      alert('Please select a date');
      return;
    }
    try {
      const res = await apiClient('/api/appointments/availability/exceptions', {
        method: 'POST',
        body: JSON.stringify({
          date: excDate,
          isAvailable: excIsAvailable,
          reason: excReason || undefined,
          customStartTime: excIsAvailable ? excCustomStart || undefined : undefined,
          customEndTime: excIsAvailable ? excCustomEnd || undefined : undefined,
          forceIfConflicts,
        }),
      });

      if (res.data?.hasConflict) {
        setConflictWarning(res.data);
      } else {
        setConflictWarning(null);
        alert(res.message || 'Date exception recorded.');
        setExcDate('');
        setExcReason('');
        loadAvailabilityData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save exception');
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!window.confirm('Remove this exception/leave entry?')) return;
    try {
      await apiClient(`/api/appointments/availability/exceptions/${id}`, { method: 'DELETE' });
      loadAvailabilityData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exception');
    }
  };

  const handleGenerateSlots = async () => {
    try {
      const res = await apiClient('/api/appointments/availability/generate-slots', {
        method: 'POST',
        body: JSON.stringify({ daysAhead: 14 }),
      });
      alert(res.message || 'Slots generated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to generate slots');
    }
  };

  const loadAuthorizedPatients = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient('/api/doctors/authorized-patients');
      if (res.data) {
        setPatients(res.data);
        if (res.data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(res.data[0].patient.id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const res = await apiClient('/api/appointments/my');
      if (res.data) setAppointments(res.data);
    } catch (err: any) {
      console.error('Failed to load doctor appointments:', err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    loadAuthorizedPatients();
    loadAppointments();
    loadAvailabilityData();
  }, []);

  useEffect(() => {
    if (activeTab === 'availability') {
      loadAvailabilityData();
    }
  }, [activeTab]);

  const loadPatientRecords = async (pId: string) => {
    try {
      setRecordsLoading(true);
      const res = await apiClient(`/api/doctors/patients/${pId}/records`);
      if (res.data) setPatientRecords(res.data);
    } catch (err: any) {
      alert(`Access check: ${err.message}`);
      setPatientRecords(null);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId && activeTab === 'patients') {
      loadPatientRecords(selectedPatientId);
    }
  }, [selectedPatientId, activeTab]);

  // Appointment Status Updater
  const handleUpdateAppointment = async (apptId: string, status: AppointmentStatus) => {
    try {
      await apiClient(`/api/appointments/${apptId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadAppointments();
      alert(`Appointment status marked as ${status}`);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Quick Access Lookup (ID + Code)
  const handleQuickAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAccessError(null);
    setQuickAccessLoading(true);
    try {
      const res = await apiClient('/api/doctors/quick-access', {
        method: 'POST',
        body: JSON.stringify({
          patientIdentifier: quickPatientId.trim(),
          accessCode: quickAccessCode.trim(),
        }),
      });

      if (res.data?.patient) {
        setQuickPatientData(res.data.patient);
        setDocUploadTargetPatientId(res.data.patient.id);
      }
    } catch (err: any) {
      setQuickAccessError(err.message || 'Verification failed. Please check Patient ID and Access Code.');
      setQuickPatientData(null);
    } finally {
      setQuickAccessLoading(false);
    }
  };

  // Doctor Upload Document for Patient
  const handleDoctorUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = docUploadTargetPatientId || selectedPatientId || quickPatientData?.id;
    if (!targetId || !docFile || !docTitle) {
      alert('Patient, title, and file attachment are required.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle);
      formData.append('category', docCategory);
      formData.append('patientId', targetId);
      if (docDescription) formData.append('description', docDescription);

      await apiClient('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setShowDocUploadModal(false);
      setDocFile(null);
      setDocTitle('');
      setDocDescription('');
      alert('Medical record uploaded and saved securely for patient.');

      // Refresh records
      if (selectedPatientId) await loadPatientRecords(selectedPatientId);
      if (quickPatientData) {
        // Re-run quick access lookup
        const ref = await apiClient('/api/doctors/quick-access', {
          method: 'POST',
          body: JSON.stringify({ patientIdentifier: quickPatientId, accessCode: quickAccessCode }),
        });
        if (ref.data?.patient) setQuickPatientData(ref.data.patient);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Clinical Encounter submission
  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedPatientId || quickPatientData?.id;
    if (!targetId || !chiefComplaint || !assessmentAndPlan) return;

    try {
      await apiClient('/api/doctors/encounters', {
        method: 'POST',
        body: JSON.stringify({
          patientId: targetId,
          chiefComplaint,
          assessmentAndPlan,
          bloodPressureSystolic: bpSystolic,
          bloodPressureDiastolic: bpDiastolic,
          heartRateBpm: heartRate,
        }),
      });

      setShowEncounterModal(false);
      setChiefComplaint('');
      setAssessmentAndPlan('');
      if (selectedPatientId) await loadPatientRecords(selectedPatientId);
      alert('Clinical encounter and vitals recorded.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Digital Prescription submission
  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedPatientId || quickPatientData?.id;
    if (!targetId || !diagnosis || !medName) return;

    try {
      await apiClient('/api/doctors/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientId: targetId,
          diagnosis,
          medications: [
            {
              name: medName,
              dosage: medDosage || '500mg',
              frequency: medFrequency || '1-0-1',
              duration: medDuration || '7 days',
            },
          ],
        }),
      });

      setShowPrescriptionModal(false);
      setDiagnosis('');
      setMedName('');
      if (selectedPatientId) await loadPatientRecords(selectedPatientId);
      alert('Prescription issued and recorded successfully.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Break-glass modal
  const handleBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassPatientId || !breakGlassJustification) return;

    try {
      const res = await apiClient('/api/consent/break-glass', {
        method: 'POST',
        body: JSON.stringify({
          patientId: breakGlassPatientId,
          justification: breakGlassJustification,
          confirmedEmergency: true,
        }),
      });

      setShowBreakGlassModal(false);
      alert(`Break-Glass Override Successful: ${res.message}`);
      await loadAuthorizedPatients();
      setSelectedPatientId(breakGlassPatientId);
    } catch (err: any) {
      alert(`Break-Glass Override Failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-teal-800 to-slate-900 text-white shadow-lg">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Healthcare Provider & Clinic Console</span>
          </div>
          <h1 className="text-2xl font-bold">
            Dr. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-xs text-teal-200">
            Verified Practitioner • Consent-Enforced Access • Cryptographic Merkle Auditing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDocUploadTargetPatientId(selectedPatientId || '');
              setShowDocUploadModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Patient Document</span>
          </button>
          <button
            onClick={() => setShowBreakGlassModal(true)}
            className="px-3.5 py-2 rounded-xl bg-emergency-600 hover:bg-emergency-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-colors animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Break-Glass Override</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('patients')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'patients'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Authorized Patient Roster ({patients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quick-access')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'quick-access'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <span>Quick Access (ID & Code)</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'appointments'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Received Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'availability'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarRange className="w-4 h-4 text-teal-600" />
          <span>Manage Availability & Slots</span>
        </button>
      </div>

      {/* TAB 1: AUTHORIZED PATIENT ROSTER & RECORDS */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Authorized Patients */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Authorized Patients</span>
              <span className="text-[10px] text-teal-600">Active Consent</span>
            </h2>

            <div className="space-y-2">
              {patients.map((item) => {
                const p = item.patient;
                const isSelected = selectedPatientId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm">
                        {p.user?.firstName} {p.user?.lastName}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {p.bloodGroup}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {p.city} • DOB: {new Date(p.dateOfBirth).toLocaleDateString()}
                    </div>
                    <div className="mt-2 text-[10px] font-semibold text-teal-700 bg-white/70 p-1.5 rounded-lg border border-teal-100 flex items-center justify-between">
                      <span>Purpose: {item.activeGrant.purpose}</span>
                      <span>Expires: {new Date(item.activeGrant.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}

              {patients.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  No active consent grants yet. Use &quot;Quick Access&quot; or request consent from patient.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Patient Records */}
          <div className="lg:col-span-8 space-y-6">
            {recordsLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200 animate-pulse">
                Verifying cryptographic consent & retrieving authorized health records...
              </div>
            ) : patientRecords ? (
              <div className="space-y-6">
                {/* Patient Summary Header */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {patientRecords.patient.user.firstName} {patientRecords.patient.user.lastName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      ID: <span className="font-mono">{patientRecords.patient.id}</span> • Blood Group:{' '}
                      <strong>{patientRecords.patient.bloodGroup}</strong> • Phone:{' '}
                      {patientRecords.patient.user.phoneNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDocUploadTargetPatientId(patientRecords.patient.id);
                        setShowDocUploadModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-teal-600 text-teal-700 hover:bg-teal-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Report</span>
                    </button>
                    <button
                      onClick={() => setShowEncounterModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Encounter</span>
                    </button>
                    <button
                      onClick={() => setShowPrescriptionModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Issue Prescription</span>
                    </button>
                  </div>
                </div>

                {/* Patient Conditions & Allergies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-bold text-slate-700">Documented Conditions</div>
                    <div className="space-y-1">
                      {patientRecords.patient.conditions?.map((c: any) => (
                        <div key={c.id} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="font-semibold text-slate-900">{c.name}</span>
                          {c.notes && <p className="text-[11px] text-slate-500 mt-0.5">{c.notes}</p>}
                        </div>
                      ))}
                      {(!patientRecords.patient.conditions || patientRecords.patient.conditions.length === 0) && (
                        <div className="text-xs text-slate-400">None on record</div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-bold text-slate-700">Known Allergies</div>
                    <div className="space-y-1">
                      {patientRecords.patient.allergies?.map((a: any) => (
                        <div key={a.id} className="text-xs p-2 rounded-lg bg-red-50 text-red-900 border border-red-100">
                          <span className="font-bold">{a.allergen}</span> ({a.severity})
                          {a.reaction && <p className="text-[11px] text-red-700 mt-0.5">{a.reaction}</p>}
                        </div>
                      ))}
                      {(!patientRecords.patient.allergies || patientRecords.patient.allergies.length === 0) && (
                        <div className="text-xs text-slate-400">None recorded</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patient Medical Documents */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Medical Documents & Lab Reports ({patientRecords.documents?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {patientRecords.documents?.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900">{doc.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {doc.category} • {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.downloadUrl && (
                            <a
                              href={doc.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>View File</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prescriptions */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Active Prescriptions</h3>
                  <div className="space-y-2">
                    {patientRecords.prescriptions?.map((p: any) => (
                      <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <div className="font-bold text-slate-900 flex items-center justify-between">
                          <span>Diagnosis: {p.diagnosis}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Issued: {new Date(p.issuedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          {p.medications?.map((m: any) => (
                            <span key={m.id} className="mr-3">
                              • <strong>{m.name}</strong> ({m.dosage}, {m.frequency})
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                Select a patient from the left column to view authorized clinical records.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUICK ACCESS BY PATIENT ID & ACCESS CODE */}
      {activeTab === 'quick-access' && (
        <div className="space-y-6">
          {/* Lookup Input Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Instant Consultation Access by Patient ID & PIN</h2>
                <p className="text-xs text-slate-500">
                  Enter patient&#39;s ID or email along with their 6-character Consultation Access Code.
                </p>
              </div>
            </div>

            {quickAccessError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {quickAccessError}
              </div>
            )}

            <form onSubmit={handleQuickAccess} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient ID, Email, or Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. patient.aarav@healthsync.mock"
                    value={quickPatientId}
                    onChange={(e) => setQuickPatientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Consultation Access Code / PIN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HS-8821 or HS-4490"
                    value={quickAccessCode}
                    onChange={(e) => setQuickAccessCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-500">
                  Demo Codes: <strong>HS-8821</strong> (Aarav), <strong>HS-4490</strong> (Sunita)
                </div>
                <button
                  type="submit"
                  disabled={quickAccessLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {quickAccessLoading ? 'Verifying PIN...' : 'Unlock Patient File'}
                </button>
              </div>
            </form>
          </div>

          {/* Unlocked Patient Clinical Details */}
          {quickPatientData && (
            <div className="p-6 rounded-2xl bg-white border border-indigo-200 shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                    {quickPatientData.user.firstName[0]}
                    {quickPatientData.user.lastName[0]}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Unlocked via Verified Code [{quickAccessCode.toUpperCase()}]</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                      {quickPatientData.user.firstName} {quickPatientData.user.lastName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      DOB: {new Date(quickPatientData.dateOfBirth).toLocaleDateString()} • Blood Group:{' '}
                      <strong>{quickPatientData.bloodGroup}</strong> • Phone: {quickPatientData.user.phoneNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDocUploadTargetPatientId(quickPatientData.id);
                      setShowDocUploadModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Record</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPatientId(quickPatientData.id);
                      setShowEncounterModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Consultation</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPatientId(quickPatientData.id);
                      setShowPrescriptionModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Issue Rx</span>
                  </button>
                </div>
              </div>

              {/* Conditions & Allergies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-2">Conditions & Medical History</div>
                  {quickPatientData.conditions?.length > 0 ? (
                    quickPatientData.conditions.map((c: any) => (
                      <div key={c.id} className="text-xs font-semibold text-slate-800 mb-1">
                        • {c.name} {c.notes && <span className="text-[11px] font-normal text-slate-500">({c.notes})</span>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400">None on record</div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100">
                  <div className="text-xs font-bold text-rose-900 mb-2">Drug & Environmental Allergies</div>
                  {quickPatientData.allergies?.length > 0 ? (
                    quickPatientData.allergies.map((a: any) => (
                      <div key={a.id} className="text-xs font-bold text-rose-800 mb-1">
                        ⚠️ {a.allergen} ({a.severity}) {a.reaction && <span className="text-[11px] font-normal">({a.reaction})</span>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-rose-400">No known allergies</div>
                  )}
                </div>
              </div>

              {/* Recent Daily Health Logs / Vitals */}
              {quickPatientData.dailyHealthLogs && quickPatientData.dailyHealthLogs.length > 0 && (
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Recent Daily Vitals Logs (Sugar & Blood Pressure)</span>
                    <span className="text-[11px] text-slate-400">{quickPatientData.dailyHealthLogs.length} entries</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="py-2 px-2">Date</th>
                          <th className="py-2 px-2">BP (mmHg)</th>
                          <th className="py-2 px-2">Fasting Sugar</th>
                          <th className="py-2 px-2">Post-Meal Sugar</th>
                          <th className="py-2 px-2">Pulse</th>
                          <th className="py-2 px-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {quickPatientData.dailyHealthLogs.slice(0, 5).map((l: any) => (
                          <tr key={l.id}>
                            <td className="py-2 px-2 font-semibold">
                              {new Date(l.logDate).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-2">
                              {l.bloodPressureSystolic ? `${l.bloodPressureSystolic}/${l.bloodPressureDiastolic}` : '---'}
                            </td>
                            <td className="py-2 px-2">
                              {l.bloodSugarFasting ? `${l.bloodSugarFasting} mg/dL` : '---'}
                            </td>
                            <td className="py-2 px-2">
                              {l.bloodSugarPostPrandial ? `${l.bloodSugarPostPrandial} mg/dL` : '---'}
                            </td>
                            <td className="py-2 px-2">{l.heartRateBpm ? `${l.heartRateBpm} bpm` : '---'}</td>
                            <td className="py-2 px-2 text-slate-500">{l.notes || '---'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Medical Documents */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900">
                  Uploaded Diagnostic Documents & Prescriptions ({quickPatientData.medicalDocuments?.length || 0})
                </div>
                <div className="space-y-2">
                  {quickPatientData.medicalDocuments?.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{doc.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {doc.category} • {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.downloadUrl && (
                          <a
                            href={doc.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECEIVED APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Received Appointments & Clinical Bookings</h2>
              <p className="text-xs text-slate-500">
                Patients who have booked consultations with your clinic or schedule
              </p>
            </div>
            <button
              onClick={loadAppointments}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Patient Name</th>
                  <th className="py-2.5 px-3 font-semibold">Time & Date</th>
                  <th className="py-2.5 px-3 font-semibold">Facility</th>
                  <th className="py-2.5 px-3 font-semibold">Reason for Visit</th>
                  <th className="py-2.5 px-3 font-semibold">Ref Code</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.length > 0 ? (
                  appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {appt.patient?.user?.firstName} {appt.patient?.user?.lastName}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {appt.patient?.user?.phoneNumber || appt.patient?.user?.email}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {new Date(appt.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(appt.slot.startTime).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {appt.slot.facility?.name || 'Main Clinic'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {appt.reasonForVisit}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-700">
                        {appt.bookingReference}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            appt.status === AppointmentStatus.CONFIRMED
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : appt.status === AppointmentStatus.COMPLETED
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : appt.status === AppointmentStatus.CANCELLED || appt.status === AppointmentStatus.REJECTED
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        {appt.status === AppointmentStatus.CONFIRMED && (
                          <button
                            onClick={() => router.push(`/consultation/${appt.id}`)}
                            className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <Video className="w-3 h-3" />
                            <span>Live Room</span>
                          </button>
                        )}
                        {appt.status !== AppointmentStatus.CONFIRMED && appt.status !== AppointmentStatus.COMPLETED && (
                          <button
                            onClick={() => handleUpdateAppointment(appt.id, AppointmentStatus.CONFIRMED)}
                            className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {appt.status === AppointmentStatus.CONFIRMED && (
                          <button
                            onClick={() => handleUpdateAppointment(appt.id, AppointmentStatus.COMPLETED)}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors"
                          >
                            Complete
                          </button>
                        )}
                        {appt.status !== AppointmentStatus.CANCELLED && appt.status !== AppointmentStatus.REJECTED && (
                          <button
                            onClick={() => handleUpdateAppointment(appt.id, AppointmentStatus.REJECTED)}
                            className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No incoming appointment bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DOCTOR AVAILABILITY & APPOINTMENT SLOT MANAGEMENT */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Manage Clinical Availability & Slots</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure your weekly consultation schedule, appointment duration, daily patient capacity, break times, and date leaves.
              </p>
            </div>
            <button
              onClick={handleGenerateSlots}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate 14-Day Slots</span>
            </button>
          </div>

          {/* Conflict Warning Notification Banner */}
          {conflictWarning && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">
                    Confirmed Appointments Conflict Detected
                  </h4>
                  <p className="text-xs text-amber-700">
                    {conflictWarning.message}
                  </p>
                </div>
              </div>

              {conflictWarning.conflictingAppointments?.length > 0 && (
                <div className="bg-white/80 p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs text-slate-700 max-h-40 overflow-y-auto">
                  <span className="font-semibold text-slate-900">Affected Confirmed Bookings:</span>
                  {conflictWarning.conflictingAppointments.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between py-1 border-b border-amber-100 last:border-0">
                      <span>{c.patientName} (Ref: <code className="font-mono text-teal-700">{c.reference}</code>)</span>
                      <span className="font-semibold text-slate-600">{c.time}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleSaveException(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
                >
                  Confirm Leave & Keep Existing Appointments
                </button>
                <button
                  onClick={() => setConflictWarning(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Schedule & Leave Forms */}
            <div className="lg:col-span-5 space-y-6">
              {/* Form 1: Weekly Schedule Editor */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">Set Weekly Availability</h3>
                </div>

                <form onSubmit={handleSaveSchedule} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Healthcare Facility *
                    </label>
                    <select
                      value={schedFacilityId}
                      onChange={(e) => setSchedFacilityId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="">Select Facility...</option>
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Day of Week *
                    </label>
                    <select
                      value={schedDayOfWeek}
                      onChange={(e) => setSchedDayOfWeek(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                      <option value={0}>Sunday</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
                      <input
                        type="time"
                        required
                        value={schedStartTime}
                        onChange={(e) => setSchedStartTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
                      <input
                        type="time"
                        required
                        value={schedEndTime}
                        onChange={(e) => setSchedEndTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Slot Duration *
                      </label>
                      <select
                        value={schedDuration}
                        onChange={(e) => setSchedDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      >
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={20}>20 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Daily Patient Limit *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        required
                        value={schedMaxPatients}
                        onChange={(e) => setSchedMaxPatients(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Break Start (Optional)</label>
                      <input
                        type="time"
                        value={schedBreakStart}
                        onChange={(e) => setSchedBreakStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Break End (Optional)</label>
                      <input
                        type="time"
                        value={schedBreakEnd}
                        onChange={(e) => setSchedBreakEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm"
                  >
                    Save Weekly Schedule
                  </button>
                </form>
              </div>

              {/* Form 2: Leave & Exceptional Dates */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Record Leave / Date Exception</h3>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Date *</label>
                    <input
                      type="date"
                      value={excDate}
                      onChange={(e) => setExcDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="excType"
                        checked={!excIsAvailable}
                        onChange={() => setExcIsAvailable(false)}
                      />
                      <span>Mark as Leave / Holiday</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="excType"
                        checked={excIsAvailable}
                        onChange={() => setExcIsAvailable(true)}
                      />
                      <span>Special Working Hours</span>
                    </label>
                  </div>

                  {!excIsAvailable ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave</label>
                      <input
                        type="text"
                        placeholder="e.g. Annual Vacation, Medical Conference, Personal"
                        value={excReason}
                        onChange={(e) => setExcReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Start</label>
                        <input
                          type="time"
                          value={excCustomStart}
                          onChange={(e) => setExcCustomStart(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Custom End</label>
                        <input
                          type="time"
                          value={excCustomEnd}
                          onChange={(e) => setExcCustomEnd(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveException(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition shadow-sm"
                  >
                    Save Date Exception
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Existing Schedules & Leaves Lists */}
            <div className="lg:col-span-7 space-y-6">
              {/* Existing Weekly Schedules */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Configured Weekly Availability</h3>
                  <span className="text-xs text-slate-500 font-semibold">{availabilities.length} Days Configured</span>
                </div>

                <div className="space-y-2.5">
                  {availabilities.map((sched) => {
                    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    return (
                      <div
                        key={sched.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{days[sched.dayOfWeek]}</span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                              {sched.slotDurationMinutes}m slots
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                              Max {sched.maxDailyPatients} patients/day
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            <strong>{sched.startTime} – {sched.endTime}</strong>
                            {sched.breakStartTime && (
                              <span className="text-slate-500 ml-2">
                                (Break: {sched.breakStartTime} – {sched.breakEndTime})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Facility: {sched.facility?.name} ({sched.facility?.city})
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSchedule(sched.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove availability"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {availabilities.length === 0 && (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No weekly availability rules configured yet. Use the form on the left to add your working hours.
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Leaves & Exceptions List */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Recorded Leaves & Special Dates</h3>
                  <span className="text-xs text-slate-500 font-semibold">{exceptions.length} Entries</span>
                </div>

                <div className="space-y-2">
                  {exceptions.map((exc) => (
                    <div
                      key={exc.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {new Date(exc.date).toLocaleDateString([], {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              !exc.isAvailable
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {!exc.isAvailable ? 'Leave / Unavailable' : 'Special Hours'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {exc.reason || (exc.isAvailable ? `${exc.customStartTime} - ${exc.customEndTime}` : 'Unavailable')}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteException(exc.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete exception"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {exceptions.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No upcoming leaves or date exceptions recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showDocUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Upload Patient Document / Report</h2>
              <button
                onClick={() => setShowDocUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDoctorUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Patient ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Patient Profile ID"
                  value={docUploadTargetPatientId}
                  onChange={(e) => setDocUploadTargetPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consultation Summary, Holter Monitoring, Blood Test"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as RecordCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value={RecordCategory.LAB_REPORT}>Laboratory Diagnostic Report</option>
                  <option value={RecordCategory.PRESCRIPTION}>Prescription Document</option>
                  <option value={RecordCategory.IMAGING}>Radiology / Imaging (X-Ray, MRI, CT)</option>
                  <option value={RecordCategory.DISCHARGE_SUMMARY}>Hospital Discharge Summary</option>
                  <option value={RecordCategory.CONSULTATION_NOTE}>Clinical Consultation Note</option>
                  <option value={RecordCategory.OTHER}>Other Health Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  File Attachment (PDF, JPG, PNG) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/jpeg,image/png"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Context / Findings</label>
                <textarea
                  rows={2}
                  placeholder="Doctor notes, impressions, follow-up recommendations..."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDocUploadModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isUploadingDoc ? 'Hashing & Uploading...' : 'Upload & Anchor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Encounter Modal */}
      {showEncounterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Record Clinical Encounter</h2>
            <form onSubmit={handleCreateEncounter} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Complaint *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mild chest tightness and exertional fatigue"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">SBP (mmHg)</label>
                  <input
                    type="number"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">DBP (mmHg)</label>
                  <input
                    type="number"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Heart Rate (BPM)</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assessment & Plan *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Clinical assessment, diagnosis, investigations ordered..."
                  value={assessmentAndPlan}
                  onChange={(e) => setAssessmentAndPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEncounterModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  Save Encounter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900">Issue Digital Prescription</h2>
            <form onSubmit={handleCreatePrescription} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stage 1 Essential Hypertension"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medication Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amlodipine Besylate"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 5mg"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Frequency</label>
                  <input
                    type="text"
                    placeholder="e.g. 1-0-0 OD"
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 days"
                    value={medDuration}
                    onChange={(e) => setMedDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  Sign & Anchor Rx
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Break Glass Modal */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 bg-red-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border-2 border-red-500">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Audited Break-Glass Emergency Override</h2>
                <p className="text-[11px] text-slate-500">Subject to strict regulatory logging & clinical audit</p>
              </div>
            </div>

            <form onSubmit={handleBreakGlass} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Patient ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter patient ID or email"
                  value={breakGlassPatientId}
                  onChange={(e) => setBreakGlassPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Justification *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Acute trauma, unconscious patient, severe anaphylaxis..."
                  value={breakGlassJustification}
                  onChange={(e) => setBreakGlassJustification(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                >
                  Execute Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

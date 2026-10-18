'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  User,
  DollarSign,
} from 'lucide-react';

export default function AppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Booking Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [apptsRes, slotsRes, docsRes] = await Promise.all([
        apiClient('/api/appointments/my').catch(() => null),
        apiClient('/api/appointments/slots').catch(() => null),
        apiClient('/api/doctors/directory').catch(() => null),
      ]);

      if (apptsRes?.data) setAppointments(apptsRes.data);
      if (slotsRes?.data) setAvailableSlots(slotsRes.data);
      if (docsRes?.data) setDoctors(docsRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter slots for the currently selected doctor in modal
  const filteredSlots = selectedDoctorId
    ? availableSlots.filter((s) => s.doctorId === selectedDoctorId && !s.isBooked)
    : availableSlots.filter((s) => !s.isBooked);

  const openBookingForDoctor = (doctorId?: string) => {
    setBookingError(null);
    setSelectedDoctorId(doctorId || '');
    setSelectedSlotId('');
    setReasonForVisit('');
    setShowBookingModal(true);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId || !reasonForVisit) return;

    const chosenSlot = availableSlots.find((s) => s.id === selectedSlotId);
    if (!chosenSlot) return;

    setIsBooking(true);
    setBookingError(null);

    try {
      await apiClient('/api/appointments/book', {
        method: 'POST',
        body: JSON.stringify({
          slotId: chosenSlot.id,
          doctorId: chosenSlot.doctorId,
          facilityId: chosenSlot.facilityId,
          reasonForVisit,
        }),
      });

      setShowBookingModal(false);
      setSelectedSlotId('');
      setSelectedDoctorId('');
      setReasonForVisit('');
      await loadData();
      alert('Appointment successfully booked! Booking reference generated.');
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book slot');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Consultations & Appointments</h1>
          <p className="text-xs text-slate-500">
            Select a verified doctor, choose an available time slot, and reserve your consultation
          </p>
        </div>

        <button
          onClick={() => openBookingForDoctor()}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Appointment</span>
        </button>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Schedule Doctor Consultation</h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-4">
              {/* Doctor Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Select Healthcare Provider *
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    setSelectedSlotId('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">Any Doctor / Specialist</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user?.firstName} {d.user?.lastName} — {d.specialties?.[0]?.name || 'Physician'} ({d.experienceYears} yrs exp)
                    </option>
                  ))}
                </select>
              </div>

              {/* Slot Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Choose Available Time Slot *
                </label>
                <select
                  required
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">
                    {filteredSlots.length > 0 ? 'Select a Time Slot...' : 'No available slots for selected doctor'}
                  </option>
                  {filteredSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      Dr. {s.doctor?.user?.firstName} {s.doctor?.user?.lastName} ({s.doctor?.specialties?.[0]?.name || 'Specialist'}) —{' '}
                      {new Date(s.startTime).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(s.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      [{s.facility?.name}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Consultation Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Reason for Consultation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Follow-up consultation, recurring blood pressure review, or symptom evaluation."
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking || !selectedSlotId || !reasonForVisit}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {isBooking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  <span>{isBooking ? 'Reserving...' : 'Confirm Appointment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Available Doctors Directory Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Available Doctors & Clinical Specialists</h2>
          </div>
          <span className="text-xs text-slate-500">{doctors.length} Doctors Registered</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((d) => {
            const docSlots = availableSlots.filter((s) => s.doctorId === d.id && !s.isBooked);
            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-brand-500 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-base shrink-0">
                        {d.user?.firstName?.[0]}
                        {d.user?.lastName?.[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Dr. {d.user?.firstName} {d.user?.lastName}
                        </h3>
                        <p className="text-xs font-semibold text-brand-700">
                          {d.specialties?.[0]?.name || 'Specialist Physician'}
                        </p>
                      </div>
                    </div>

                    {d.verificationStatus === 'VERIFIED' ? (
                      <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200 flex items-center gap-1 shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 shrink-0">
                        Pending
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {d.bio || 'General Clinical Specialist providing patient consultation and diagnostics.'}
                  </p>

                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Experience:</span>
                      <span className="font-semibold">{d.experienceYears} Years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">License:</span>
                      <span className="font-mono text-[11px]">{d.licenseNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Consultation Fee:</span>
                      <span className="font-semibold text-slate-800">₹{d.consultationFee || 800}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-teal-700 font-semibold">
                    {docSlots.length} Open Slots
                  </span>
                  <button
                    onClick={() => openBookingForDoctor(d.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Consultation</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Booked Appointments List */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Your Scheduled Appointments</h2>
          </div>
          <span className="text-xs text-slate-500">{appointments.length} Consultations</span>
        </div>

        <div className="space-y-3">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Dr. {a.slot?.doctor?.user?.firstName} {a.slot?.doctor?.user?.lastName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold text-[10px] border border-teal-200">
                      {a.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    {a.slot?.facility?.name} • <strong>Ref: {a.bookingReference}</strong>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(a.slot?.startTime).toLocaleString()}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 italic pt-1">
                    Reason: &quot;{a.reasonForVisit}&quot;
                  </p>
                </div>
              </div>

              <div className="self-end md:self-center">
                <span className="text-[11px] font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  ID: {a.bookingReference}
                </span>
              </div>
            </div>
          ))}

          {appointments.length === 0 && !isLoading && (
            <div className="p-10 text-center bg-white border border-dashed border-slate-300 rounded-2xl space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No scheduled appointments yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose a verified doctor from the directory above to schedule your first consultation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Heart,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Save,
  MapPin,
  AlertTriangle,
  ArrowLeft,
  Key,
} from 'lucide-react';
import Link from 'next/link';

export default function PatientProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile Form State
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('PREFER_NOT_TO_SAY');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Family');

  // Clinical tags
  const [allergiesText, setAllergiesText] = useState('');
  const [conditionsText, setConditionsText] = useState('');

  // Consultation code
  const [accessCode, setAccessCode] = useState('');

  // Route Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient('/api/patients/profile');
      if (res?.data) {
        const p = res.data;
        if (p.dateOfBirth) {
          setDateOfBirth(p.dateOfBirth.split('T')[0]);
        }
        if (p.gender) setGender(p.gender);
        if (p.bloodGroup) setBloodGroup(p.bloodGroup);
        if (p.heightCm) setHeightCm(String(p.heightCm));
        if (p.weightKg) setWeightKg(String(p.weightKg));
        if (p.address) setAddress(p.address);
        if (p.city) setCity(p.city);
        if (p.state) setState(p.state);
        if (p.postalCode) setPostalCode(p.postalCode);
        if (p.accessCode) setAccessCode(p.accessCode);

        // Emergency Contacts
        if (p.emergencyContacts && p.emergencyContacts.length > 0) {
          const ec = p.emergencyContacts[0];
          setEmergencyName(ec.name || '');
          setEmergencyPhone(ec.phoneNumber || '');
          setEmergencyRelation(ec.relationship || 'Family');
        }

        // Allergies
        if (p.allergies && Array.isArray(p.allergies)) {
          setAllergiesText(p.allergies.map((a: any) => a.allergen).join(', '));
        }

        // Conditions
        if (p.conditions && Array.isArray(p.conditions)) {
          setConditionsText(p.conditions.map((c: any) => c.name).join(', '));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load medical profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const knownAllergies = allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const chronicConditions = conditionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        dateOfBirth: dateOfBirth || '1995-01-01',
        gender,
        bloodGroup,
        address: address || 'Main Road',
        city: city || 'New Delhi',
        state: state || 'Delhi',
        postalCode: postalCode || '110001',
        emergencyContactName: emergencyName.trim() || `${user?.lastName || 'Emergency'} Contact`,
        emergencyContactPhone: emergencyPhone.trim() || user?.phoneNumber || '+91-9999999999',
        emergencyContactRelation: emergencyRelation.trim() || 'Family',
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        knownAllergies,
        chronicConditions,
      };

      await apiClient('/api/patients/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSaveSuccess('Medical profile and emergency contacts updated successfully!');
      await refreshUser();
      await loadProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please verify your inputs.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateAccessCode = async () => {
    setIsRegeneratingCode(true);
    setError(null);
    try {
      const res = await apiClient('/api/patients/regenerate-access-code', { method: 'POST' });
      if (res?.data?.accessCode) {
        setAccessCode(res.data.accessCode);
        setSaveSuccess(`New consultation PIN generated: ${res.data.accessCode}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate consultation PIN.');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  if (authLoading || (isLoading && !error)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Loading patient clinical profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <Link
            href="/patient/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Patient Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Patient Medical Profile & Settings</h1>
          <p className="text-xs text-slate-500">
            Manage your personal clinical details, emergency contact, and physician consultation code
          </p>
        </div>

        {/* Access Code Pill */}
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Consultation PIN</div>
            <div className="font-mono text-base font-extrabold text-indigo-900">
              {accessCode || 'Pending'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRegenerateAccessCode}
            disabled={isRegeneratingCode}
            title="Generate a new PIN code"
            className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingCode ? 'animate-spin' : ''}`} />
            <span className="text-[11px]">Regenerate</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Demographics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-brand-600" />
            <span>Personal & Biometric Information</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={`${user?.firstName || ''} ${user?.lastName || ''}`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
              />
            </div>
          </div>

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
                min="30"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 175"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                min="1"
                max="350"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="e.g. 72"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Residential Address */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>Contact & Address Details</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Apartment, Street, Locality"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="110001"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contacts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-rose-600" />
              <span>Primary Emergency Contact</span>
            </h2>
            <span className="text-[10px] text-slate-500">Critical for emergency room admissions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name *</label>
              <input
                type="text"
                required
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone Number *</label>
              <input
                type="tel"
                required
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+91-9876543210"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
              <input
                type="text"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="e.g. Spouse, Parent, Sibling"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Allergies & Chronic Conditions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Heart className="w-4 h-4 text-teal-600" />
            <span>Allergies & Chronic Health Conditions</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Known Drug & Food Allergies
              </label>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts, Sulfa Drugs (comma-separated)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Separate multiple items with commas</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Diagnosed Chronic Conditions
              </label>
              <input
                type="text"
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                placeholder="e.g. Essential Hypertension, Type 2 Diabetes (comma-separated)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Shared with consulting doctors for clinical safety</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

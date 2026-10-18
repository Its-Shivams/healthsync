'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Activity,
  Heart,
  Droplet,
  FileText,
  Calendar,
  ShieldCheck,
  Bot,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Plus,
  UserCheck,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function PatientDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [vitalsSummary, setVitalsSummary] = useState<any>(null);
  const [accessCode, setAccessCode] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, timelineRes, trendsRes, vitalsRes] = await Promise.all([
          apiClient('/api/patients/profile').catch(() => null),
          apiClient('/api/patients/timeline').catch(() => null),
          apiClient('/api/patients/vitals/trends').catch(() => null),
          apiClient('/api/patients/daily-health-logs').catch(() => null),
        ]);

        if (profileRes?.data) {
          setProfile(profileRes.data);
          if (profileRes.data.accessCode) setAccessCode(profileRes.data.accessCode);
        }
        if (timelineRes?.data) setTimeline(timelineRes.data);
        if (trendsRes?.data) setTrends(trendsRes.data);
        if (vitalsRes?.data?.summary) setVitalsSummary(vitalsRes.data.summary);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRegenerateCode = async () => {
    try {
      const res = await apiClient('/api/patients/regenerate-access-code', { method: 'POST' });
      if (res.data?.accessCode) {
        setAccessCode(res.data.accessCode);
        alert(`New Consultation Access Code generated: ${res.data.accessCode}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Patient Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-teal-600 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
            <span>Unified Health Record</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-300"></span>
            <span>Cryptographically Anchored</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">
            Welcome, {user?.firstName || 'Patient'} {user?.lastName || ''}
          </h1>
          <div className="text-brand-100 text-xs md:text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Blood Group: <strong>{profile?.bloodGroup || 'Not specified'}</strong></span>
            <span>•</span>
            <span>City: <strong>{profile?.city || 'Not specified'}</strong></span>
            <span>•</span>
            {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? (
              <span>Emergency Contact: <strong>{profile.emergencyContacts[0].name} ({profile.emergencyContacts[0].phoneNumber})</strong></span>
            ) : (
              <span>
                Emergency Contact:{' '}
                <Link href="/patient/profile" className="underline font-bold text-amber-200 hover:text-white inline-flex items-center gap-1">
                  Add Emergency Contact
                </Link>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Link
            href="/patient/profile"
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors border border-white/20"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </Link>
          <Link
            href="/patient/records"
            className="px-4 py-2 rounded-xl bg-white text-brand-700 hover:bg-brand-50 text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </Link>
          <Link
            href="/patient/vitals"
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Daily Vitals</span>
          </Link>
          <Link
            href="/patient/ai-assistant"
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Care Assistant</span>
          </Link>
        </div>
      </div>

      {/* Doctor Quick Consultation Access Code Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            PIN
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
              <span>Doctor Quick-Access Consultation Code:</span>
              <span className="font-mono text-base font-black px-2 py-0.5 rounded-lg bg-white border border-indigo-300 text-indigo-700">
                {accessCode || 'Generating...'}
              </span>
            </div>
            <p className="text-[11px] text-indigo-700">
              Share this code with your consulting doctor to grant them instant access to your records on their clinic portal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(accessCode);
              alert(`Access code copied to clipboard: ${accessCode}`);
            }}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Copy Code
          </button>
          <button
            onClick={handleRegenerateCode}
            className="px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-800 hover:bg-indigo-100 text-xs font-semibold transition-colors"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Clinical Metrics Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Average Blood Pressure</span>
            <Heart className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {vitalsSummary?.avgSystolic ? `${vitalsSummary.avgSystolic} / ${vitalsSummary.avgDiastolic}` : '132 / 84'}{' '}
            <span className="text-xs font-normal text-slate-500">mmHg</span>
          </div>
          <div className="text-[11px] text-teal-600 font-medium">
            {vitalsSummary?.bpCategory || 'Stage 1 Controlled (Amlodipine)'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Average Fasting Sugar</span>
            <Droplet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {vitalsSummary?.avgFastingSugar ? vitalsSummary.avgFastingSugar : '92'}{' '}
            <span className="text-xs font-normal text-slate-500">mg/dL</span>
          </div>
          <div className="text-[11px] text-teal-600 font-medium">
            {vitalsSummary?.sugarCategory || 'Normal Range (70-99 mg/dL)'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Daily Vitals Logged</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {vitalsSummary?.totalEntries || 7} <span className="text-xs font-normal text-slate-500">Days</span>
          </div>
          <Link href="/patient/vitals" className="text-[11px] text-brand-600 font-semibold hover:underline block">
            View Trends & Averages →
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Active Consent Grants</span>
            <ShieldCheck className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">1 Active <span className="text-xs font-normal text-slate-500">Doctor</span></div>
          <div className="text-[11px] text-brand-600 font-medium">Dr. Priya Nair (Cardiology)</div>
        </div>
      </div>

      {/* Longitudinal Vitals Trend Visualization */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Longitudinal Vitals & Metabolic Trends</h2>
            <p className="text-xs text-slate-500">Blood Pressure & Cholesterol progression across clinical follow-ups</p>
          </div>
          <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full font-semibold">
            Recharts Telemetry
          </span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[60, 230]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="systolic" name="Systolic BP (mmHg)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="diastolic" name="Diastolic BP (mmHg)" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="cholesterol" name="Total Cholesterol (mg/dL)" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bloodGlucose" name="Fasting Sugar (mg/dL)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Timeline & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Medical Timeline */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Medical Timeline</h2>
            <Link href="/patient/records" className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              <span>View All Records</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {timeline.slice(0, 4).map((item, idx) => (
              <div key={item.id || idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-start gap-3 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                  {item.type === 'PRESCRIPTION' ? <FileText className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{item.description || item.doctorName || 'Clinical Record'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Portal Navigation */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Care Shortcuts</h3>
            <div className="space-y-2">
              <Link
                href="/patient/hospitals"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-brand-600" />
                  <span>Find Nearby Hospitals & Trauma</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href="/patient/appointments"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-brand-600" />
                  <span>Book Doctor Consultation</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <Link
                href="/patient/consent"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-xs font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Manage Doctor Consent & Audits</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Known Medical Allergy</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              <strong>Penicillin:</strong> Severe reaction (Urticaria, dyspnea). Automatically flagged across all doctor consultations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

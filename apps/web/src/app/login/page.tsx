'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@healthsync/shared-types';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser?.role === UserRole.DOCTOR) {
        router.push('/doctor/dashboard');
      } else if (loggedUser?.role === UserRole.HOSPITAL_ADMIN) {
        router.push('/hospital-admin/dashboard');
      } else if (
        loggedUser?.role === UserRole.LAB_ADMIN ||
        loggedUser?.role === UserRole.LAB_TECHNICIAN
      ) {
        router.push('/lab-admin/dashboard');
      } else if (loggedUser?.role === UserRole.PLATFORM_ADMIN) {
        router.push('/admin');
      } else {
        router.push('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md shadow-brand-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to HealthSync</h1>
          <p className="text-xs text-slate-500">
            Enter your registered credentials to access your health portal
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Synthetic Roles Quick-Fill */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-bold uppercase tracking-wider text-slate-400">Demo Accounts</span>
            <span className="text-[10px] text-brand-600 font-medium">Click to Quick-Fill</span>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients (Distinct Health Records)</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail('patient.aarav@healthsync.mock');
                  setPassword('HealthSync@2025');
                }}
                className={`p-2 text-left rounded-xl border transition-all text-[11px] ${
                  email === 'patient.aarav@healthsync.mock'
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 truncate">Aarav Sharma</div>
                <div className="text-[10px] text-slate-500 truncate">Hypertension • PIN: HS-8821</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('patient.sunita@healthsync.mock');
                  setPassword('HealthSync@2025');
                }}
                className={`p-2 text-left rounded-xl border transition-all text-[11px] ${
                  email === 'patient.sunita@healthsync.mock'
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 truncate">Sunita Patel</div>
                <div className="text-[10px] text-slate-500 truncate">Diabetes • PIN: HS-4490</div>
              </button>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">Doctors</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail('doctor.priya@healthsync.mock');
                  setPassword('HealthSync@2025');
                }}
                className={`p-2 text-left rounded-xl border transition-all text-[11px] ${
                  email === 'doctor.priya@healthsync.mock'
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 truncate">Dr. Priya Nair</div>
                <div className="text-[10px] text-brand-700 truncate">Cardiology Specialist</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('doctor.rajesh@healthsync.mock');
                  setPassword('HealthSync@2025');
                }}
                className={`p-2 text-left rounded-xl border transition-all text-[11px] ${
                  email === 'doctor.rajesh@healthsync.mock'
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 truncate">Dr. Rajesh Rao</div>
                <div className="text-[10px] text-teal-700 truncate">General Physician</div>
              </button>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-1">Hospital & Admin Staff</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail('hospital.admin@apex.mock');
                  setPassword('HealthSync@2025');
                }}
                className={`p-1.5 text-left rounded-xl border transition-all text-[10px] ${
                  email === 'hospital.admin@apex.mock'
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 truncate">Clinic Admin</div>
                <div className="text-[9px] text-slate-500 truncate">Apex Clinic</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('lab.tech@apex.mock');
                  setPassword('HealthSync@2025');
                }}
                className={`p-1.5 text-left rounded-xl border transition-all text-[10px] ${
                  email === 'lab.tech@apex.mock'
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 truncate">Lab Tech</div>
                <div className="text-[9px] text-slate-500 truncate">Apex PathLab</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('admin@healthsync.mock');
                  setPassword('HealthSync@2025');
                }}
                className={`p-1.5 text-left rounded-xl border transition-all text-[10px] ${
                  email === 'admin@healthsync.mock'
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-slate-900 truncate">Root Admin</div>
                <div className="text-[9px] text-purple-700 truncate">Platform Admin</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Do not have an account?{' '}
          <Link href="/register" className="text-brand-600 font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}

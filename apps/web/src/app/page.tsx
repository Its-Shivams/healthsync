'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { UserRole } from '@healthsync/shared-types';
import {
  Activity,
  ShieldCheck,
  Bot,
  MapPin,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Building2,
  Cpu,
  Layers,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-to-b from-brand-50/60 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Trust Consent • Cryptographic Audit • Deterministic Triage</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto">
            The Patient-Centric <span className="text-brand-600">Digital Healthcare</span> Interoperability Platform
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Unified digital medical records, time-limited cryptographic consent sharing, local AI care assistance with emergency red-flag safeguards, and verified hospital discovery.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
            >
              <span>Sign In to Your Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/patient/hospitals"
              className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-brand-600" />
              <span>Find Nearby Hospitals</span>
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl border border-brand-200 bg-brand-50/50 hover:bg-brand-100/60 text-brand-700 text-sm font-semibold transition-all"
            >
              Create Account
            </Link>
          </div>

          {/* Key Portals & Services */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {/* Patient Card */}
              <Link
                href="/login"
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-lg transition-all group block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Patient Portal</div>
                    <div className="text-xs text-brand-600 font-semibold">Consent & Health Records</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Manage medical documents, grant time-bound doctor access, review audit trails, and access AI health navigation.
                </p>
              </Link>

              {/* Doctor Card */}
              <Link
                href="/login"
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-teal-500 hover:shadow-lg transition-all group block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Doctor Portal</div>
                    <div className="text-xs text-teal-600 font-semibold">Clinical Encounters & Rx</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Access authorized patient records, conduct consultations, log vital measurements, and issue verified e-prescriptions.
                </p>
              </Link>

              {/* Hospital & Admin Card */}
              <Link
                href="/login"
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-500 hover:shadow-lg transition-all group block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Administration Console</div>
                    <div className="text-xs text-indigo-600 font-semibold">License & Facility Verification</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Platform administration, doctor license approvals, hospital & clinic certifications, and comprehensive security audit trail.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Engineered for Clinical Privacy & Trust</h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm">
            HealthSync replaces fragmented paper silos with an audited, consent-governed health architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Granular Scoped Consent</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Patients explicitly grant access to specific record categories (e.g. Lab Reports only, excluding Psychiatric or Consultation notes) with time-bound expirations and instant revocation.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-brand-600" /> Backend-enforced authorization</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-brand-600" /> Audited break-glass emergency override</li>
            </ul>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Deterministic AI Triage</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              HealthSync Assistant evaluates acute warning signs (chest pain, stroke FAST, severe dyspnea) deterministically before generating normal chat, providing instant 112 emergency routing.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Default local offline Ollama model</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Strict no-prescribing guardrails</li>
            </ul>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cryptographic Integrity</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Every uploaded document is cryptographically hashed with SHA-256 for tamper-evident data verification, enabling instant proof of authenticity without data alteration.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> SHA-256 Cryptographic Checksums</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Real-time document hash verification</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white text-center space-y-6 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to test HealthSync?</h2>
          <p className="text-brand-100 max-w-xl mx-auto text-sm leading-relaxed">
            Sign in with synthetic test profiles or create a new account to test document uploads, OCR extraction, consent grants, and AI care triage.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 font-semibold text-sm shadow-md transition-colors"
            >
              Sign In to Your Account
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sm transition-colors"
            >
              Create New Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

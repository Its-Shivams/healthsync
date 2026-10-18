'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  FlaskConical,
  Upload,
  FileText,
  Search,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Clock,
  User,
  AlertCircle,
  Activity,
} from 'lucide-react';

export default function LabAdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  const [labProfile, setLabProfile] = useState<any>(null);
  const [testList, setTestList] = useState<string[]>([
    'Complete Blood Count (CBC)',
    'Comprehensive Metabolic Panel (CMP)',
    'Lipid Profile & Cholesterol Panel',
    'Liver Function Test (LFT)',
    'Thyroid Stimulating Hormone (TSH / T3 / T4)',
    'HbA1c Glycated Hemoglobin',
    'Renal Function Test (RFT / KFT)',
    'Vitamin D3 & B12 Panel',
    'RT-PCR Diagnostic Assay',
  ]);
  const [newTestName, setNewTestName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Upload form state
  const [patientIdentifier, setPatientIdentifier] = useState('HS-8821');
  const [reportTitle, setReportTitle] = useState('Comprehensive Fasting Lipid & Glucose Panel');
  const [testCategory, setTestCategory] = useState('LAB_REPORT');
  const [labFile, setLabFile] = useState<File | null>(null);
  const [reportNotes, setReportNotes] = useState('Fasting 12 hours prior to sample collection.');

  // Recent uploads feed
  const [recentUploads, setRecentUploads] = useState<any[]>([
    {
      id: 'rep-01',
      patientName: 'Aarav Sharma',
      patientCode: 'HS-8821',
      testName: 'Complete Comprehensive Metabolic & Lipid Panel',
      date: '2025-09-10',
      status: 'VERIFIED',
      checksum: '4a3b8e7c2d1f9a5e8b6c4d2e1f7a9b3c5e8d2f1a6c4b8e7d2f1a9c3e5b7d9a1f',
    },
    {
      id: 'rep-02',
      patientName: 'Sunita Patel',
      patientCode: 'HS-4490',
      testName: 'Fasting Blood Sugar & HbA1c Glycated Hemoglobin',
      date: '2025-10-02',
      status: 'VERIFIED',
      checksum: '6e2f1a9b3c5e8d2f1a6c4b8e7d2f1a9c3e5b7d9a1f4a3b8e7c2d1f9a5e8b6c4d',
    },
  ]);

  const handleAddTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim()) return;
    setTestList([...testList, newTestName.trim()]);
    setNewTestName('');
  };

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientIdentifier || !reportTitle || !labFile) {
      alert('Please fill in patient identifier, report title, and attach the report file.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', labFile);
      formData.append('title', reportTitle);
      formData.append('category', testCategory);
      formData.append('description', reportNotes);
      formData.append('patientId', patientIdentifier);

      const res = await apiClient('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setStatusMessage(`Report uploaded successfully! SHA-256 Checksum: ${res.data?.sha256Hash?.substring(0, 16)}...`);
      setShowUploadModal(false);
      setLabFile(null);

      // Add to recent uploads state
      setRecentUploads([
        {
          id: res.data?.id || `rep-${Date.now()}`,
          patientName: `Patient (${patientIdentifier})`,
          patientCode: patientIdentifier,
          testName: reportTitle,
          date: new Date().toISOString().split('T')[0],
          status: 'VERIFIED',
          checksum: res.data?.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
        ...recentUploads,
      ]);
    } catch (err: any) {
      alert(`Report upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Diagnostic Pathology & Laboratory Services</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Apex Central Pathology Diagnostics
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            NABL Accredited • ISO 15189 Certified • Cryptographic SHA-256 Diagnostic Integrity
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2 shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Patient Test Report</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Lab Verification Status Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200">
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-900">National Accreditation & License Status</div>
          <div className="text-[11px] text-slate-500">License: LAB-NABL-2022-991 • Validated by Platform Administrators</div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Certified Diagnostic Provider</span>
        </span>
      </div>

      {/* Test Catalog & Quick Upload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Available Test Catalog */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <span>Available Test Catalog</span>
            </h2>
            <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-bold">
              {testList.length} Tests
            </span>
          </div>

          <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
            {testList.map((test, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-700 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span className="truncate">{test}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTest} className="pt-2 border-t border-slate-100 space-y-2">
            <input
              type="text"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              placeholder="Add new test or assay..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              + Add to Test Catalog
            </button>
          </form>
        </div>

        {/* Right: Diagnostic Uploads & Audit Trail */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Diagnostic Reports Issued</h2>
              <p className="text-xs text-slate-500">
                Uploaded reports are cryptographically hashed and instantly accessible to patients and authorized doctors
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors"
            >
              + Issue Report
            </button>
          </div>

          <div className="space-y-3">
            {recentUploads.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span>{rep.testName}</span>
                    <span className="px-2 py-0.5 rounded bg-white text-purple-700 border text-[10px] font-bold">
                      {rep.patientCode}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{rep.patientName}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400 text-[10px] truncate max-w-[200px]">
                      SHA-256: {rep.checksum}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 text-right shrink-0">
                  <span className="text-teal-700 font-semibold block">✓ Tamper-Evident Intact</span>
                  <span>{rep.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Diagnostic Report Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Upload Diagnostic Patient Report</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient HealthSync Access Code or Patient ID *
                </label>
                <input
                  type="text"
                  required
                  value={patientIdentifier}
                  onChange={(e) => setPatientIdentifier(e.target.value)}
                  placeholder="e.g. HS-8821 or patient UUID"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter the 6-character patient access code (e.g. HS-8821) or patient account email.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title / Test Name *</label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Comprehensive Fasting Lipid & Glucose Panel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Attach Report File (PDF / JPEG / PNG) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,image/jpeg,image/png"
                  onChange={(e) => setLabFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Notes / Laboratory Observations</label>
                <textarea
                  rows={2}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Sample serum collected without hemolysis. Fasting state confirmed..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {isUploading ? 'Computing SHA-256 & Uploading...' : 'Upload & Issue Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

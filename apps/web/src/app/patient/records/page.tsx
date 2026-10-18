'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { RecordCategory } from '@healthsync/shared-types';
import {
  FileText,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  Eye,
  Check,
  Cpu,
  RefreshCw,
  Trash2,
  Plus,
  Activity,
  Heart,
  AlertTriangle,
} from 'lucide-react';

export default function PatientRecordsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<any>(null);

  // Document upload form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RecordCategory>(RecordCategory.LAB_REPORT);
  const [description, setDescription] = useState('');

  // Add Health Record form state
  const [recordType, setRecordType] = useState<'CONDITION' | 'ALLERGY' | 'RECORD'>('CONDITION');
  const [conditionName, setConditionName] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [allergenName, setAllergenName] = useState('');
  const [allergySeverity, setAllergySeverity] = useState('MODERATE');
  const [allergyReaction, setAllergyReaction] = useState('');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordSummary, setRecordSummary] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [docsRes, profileRes] = await Promise.all([
        apiClient('/api/documents').catch(() => ({ data: [] })),
        apiClient('/api/patients/profile').catch(() => ({ data: null })),
      ]);
      if (docsRes?.data) setDocuments(docsRes.data);
      if (profileRes?.data) setProfile(profileRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      if (description) formData.append('description', description);

      await apiClient('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setShowUploadModal(false);
      setFile(null);
      setTitle('');
      setDescription('');
      await loadData();
      alert('Medical document uploaded, cryptographically hashed, and verified.');
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${docTitle}"?`)) return;
    try {
      await apiClient(`/api/documents/${docId}`, { method: 'DELETE' });
      await loadData();
      alert('Document removed successfully.');
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (recordType === 'CONDITION') {
        if (!conditionName) return;
        await apiClient('/api/patients/conditions', {
          method: 'POST',
          body: JSON.stringify({ name: conditionName, notes: conditionNotes }),
        });
      } else if (recordType === 'ALLERGY') {
        if (!allergenName) return;
        await apiClient('/api/patients/allergies', {
          method: 'POST',
          body: JSON.stringify({
            allergen: allergenName,
            severity: allergySeverity,
            reaction: allergyReaction,
          }),
        });
      } else {
        if (!recordTitle) return;
        await apiClient('/api/patients/records', {
          method: 'POST',
          body: JSON.stringify({
            title: recordTitle,
            summary: recordSummary,
            recordType: 'CLINICAL_EVENT',
          }),
        });
      }

      setShowAddRecordModal(false);
      setConditionName('');
      setConditionNotes('');
      setAllergenName('');
      setAllergyReaction('');
      setRecordTitle('');
      setRecordSummary('');
      await loadData();
      alert('Health record added successfully!');
    } catch (err: any) {
      alert(`Error saving record: ${err.message}`);
    }
  };

  const handleDeleteCondition = async (id: string) => {
    if (!confirm('Delete this medical condition?')) return;
    try {
      await apiClient(`/api/patients/conditions/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      alert(`Error deleting condition: ${err.message}`);
    }
  };

  const handleDeleteAllergy = async (id: string) => {
    if (!confirm('Delete this allergy entry?')) return;
    try {
      await apiClient(`/api/patients/allergies/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      alert(`Error deleting allergy: ${err.message}`);
    }
  };

  const handleVerifyIntegrity = async (docId: string) => {
    try {
      const res = await apiClient(`/api/documents/${docId}/verify`);
      setSelectedVerification(res.data);
    } catch (err: any) {
      alert(`Verification check error: ${err.message}`);
    }
  };

  const handleConfirmDraft = async (docId: string) => {
    try {
      await apiClient(`/api/documents/${docId}/verify-draft`, { method: 'POST' });
      await loadData();
      alert('OCR Draft values verified and committed to official health timeline.');
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-950 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digital Health Vault & Records</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Medical Documents & Clinical Records</h1>
          <p className="text-xs text-slate-300">
            Encrypted private storage with SHA-256 cryptographic proofs, versioning, and patient-controlled records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddRecordModal(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Clinical Record</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Section: Active Diagnoses & Allergies (Patient Records) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conditions */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Active Diagnoses & Conditions</h2>
                <p className="text-[11px] text-slate-500">Documented chronic or active medical conditions</p>
              </div>
            </div>
            <button
              onClick={() => {
                setRecordType('CONDITION');
                setShowAddRecordModal(true);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2">
            {profile?.conditions && profile.conditions.length > 0 ? (
              profile.conditions.map((c: any) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    {c.notes && <div className="text-[11px] text-slate-500">{c.notes}</div>}
                  </div>
                  <button
                    onClick={() => handleDeleteCondition(c.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete condition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No active conditions recorded.
              </div>
            )}
          </div>
        </div>

        {/* Allergies */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Documented Allergies</h2>
                <p className="text-[11px] text-slate-500">Known drug, environmental, or food allergies</p>
              </div>
            </div>
            <button
              onClick={() => {
                setRecordType('ALLERGY');
                setShowAddRecordModal(true);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="space-y-2">
            {profile?.allergies && profile.allergies.length > 0 ? (
              profile.allergies.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-rose-50/40 border border-rose-100 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-rose-900 flex items-center gap-1.5">
                      <span>{a.allergen}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        {a.severity}
                      </span>
                    </div>
                    {a.reaction && <div className="text-[11px] text-rose-700/80">{a.reaction}</div>}
                  </div>
                  <button
                    onClick={() => handleDeleteAllergy(a.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Delete allergy"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                No known allergies on record.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Upload Clinical Document</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Fasting Blood & Lipid Profile"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RecordCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
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
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Context / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Clinical notes, ordering physician, laboratory name..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isUploading ? 'Hashing & Encrypting...' : 'Upload & Anchor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Health Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add Health Record or Diagnosis</h2>
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Record Type *</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="CONDITION">Medical Condition / Chronic Diagnosis</option>
                  <option value="ALLERGY">Known Allergy</option>
                  <option value="RECORD">Past Surgery / Clinical Procedure</option>
                </select>
              </div>

              {recordType === 'CONDITION' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Condition Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Type 2 Diabetes, Migraine, Hypothyroidism"
                      value={conditionName}
                      onChange={(e) => setConditionName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Management Plan</label>
                    <textarea
                      rows={2}
                      placeholder="Medication regimen, regular tests, specialist notes..."
                      value={conditionNotes}
                      onChange={(e) => setConditionNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {recordType === 'ALLERGY' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Allergen Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                      value={allergenName}
                      onChange={(e) => setAllergenName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                    <select
                      value={allergySeverity}
                      onChange={(e) => setAllergySeverity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="MILD">Mild (Rash, Itching)</option>
                      <option value="MODERATE">Moderate (Hives, Swelling)</option>
                      <option value="SEVERE">Severe (Anaphylaxis, Dyspnea)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Observed Reaction</label>
                    <input
                      type="text"
                      placeholder="e.g. Urticaria and shortness of breath within 30 mins"
                      value={allergyReaction}
                      onChange={(e) => setAllergyReaction(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {recordType === 'RECORD' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure / Surgery Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Appendectomy, Knee Arthroscopy, Dental Surgery"
                      value={recordTitle}
                      onChange={(e) => setRecordTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Summary</label>
                    <textarea
                      rows={2}
                      placeholder="Hospital name, operating surgeon, recovery notes..."
                      value={recordSummary}
                      onChange={(e) => setRecordSummary(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-teal-600">
              <CheckCircle2 className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-900">Cryptographic Integrity Verified</h2>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-mono text-[10px]">CRYPTOGRAPHIC SHA-256 CHECKSUM:</span>
                <div className="font-mono text-slate-800 break-all">{selectedVerification.sha256Hash || selectedVerification.currentHash}</div>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">VERIFICATION METHOD:</span>
                <div className="font-semibold text-slate-700">{selectedVerification.verificationMethod || 'SHA-256 Cryptographic Checksum'}</div>
              </div>
              <div>
                <span className="text-slate-400 font-mono text-[10px]">INTEGRITY STATUS:</span>
                <div className="font-semibold text-teal-700">
                  {selectedVerification.isVerified ? '✓ Checksum Verified (File Untampered)' : '✕ Hash Mismatch'}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{selectedVerification.details}</p>

            <button
              onClick={() => setSelectedVerification(null)}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Close Integrity Report
            </button>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Uploaded Documents & Diagnostic Reports ({documents.length})
          </h2>
          <span className="text-xs text-slate-400 font-medium">Click &quot;Verify Integrity&quot; to audit SHA-256</span>
        </div>

        {documents.length > 0 ? (
          documents.map((doc) => (
            <div key={doc.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{doc.title}</h3>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span className="font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                        {doc.category}
                      </span>
                      <span>•</span>
                      <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                      <span>•</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Verification Status Badge */}
                  {doc.verificationStatus === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Clinically Verified</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Unverified OCR Draft</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleVerifyIntegrity(doc.id)}
                    title="Verify SHA-256 Cryptographic Integrity"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-700 font-medium flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                    <span>Verify Integrity</span>
                  </button>

                  {doc.downloadUrl && (
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50"
                      title="Download Document"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={() => handleDeleteDocument(doc.id, doc.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete this document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cryptographic Hash Bar */}
              <div className="flex flex-wrap items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 gap-2">
                <div className="flex items-center gap-1 font-mono text-slate-600 truncate">
                  <span className="text-slate-400">SHA-256:</span>
                  <span className="font-semibold">{doc.sha256Hash}</span>
                </div>
                <div className="text-teal-700 font-mono text-[10px] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Tamper-Evident SHA-256</span>
                </div>
              </div>

              {/* Extracted Lab Metrics Panel */}
              {doc.extractedDraft?.metrics && doc.extractedDraft.metrics.length > 0 && (
                <div className="p-3.5 bg-brand-50/40 rounded-xl border border-brand-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Extracted Diagnostic Metrics (Draft)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Automated Extraction</span>
                    </div>
                    {doc.verificationStatus !== 'VERIFIED' && (
                      <button
                        onClick={() => handleConfirmDraft(doc.id)}
                        className="text-[11px] font-bold text-brand-600 hover:text-brand-700 underline"
                      >
                        Confirm Values as Verified Record
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {doc.extractedDraft.metrics.map((m: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-xs">
                        <div className="text-[10px] text-slate-400 font-semibold">{m.name}</div>
                        <div className="font-bold text-slate-800 text-sm">
                          {m.value} <span className="text-[10px] font-normal text-slate-500">{m.unit}</span>
                        </div>
                        <div className="text-[9px] text-slate-400">Ref: {m.referenceRange}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No medical documents uploaded yet. Click &quot;Upload Document&quot; above to add your first record.
          </div>
        )}
      </div>
    </div>
  );
}

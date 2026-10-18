'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import { RecordCategory, AccessPurpose } from '@healthsync/shared-types';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Clock,
  UserCheck,
  AlertTriangle,
  History,
  Lock,
  RefreshCw,
} from 'lucide-react';

export default function ConsentPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [grants, setGrants] = useState<any[]>([]);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [purpose, setPurpose] = useState<AccessPurpose>(AccessPurpose.DIRECT_CARE);
  const [allowedCategories, setAllowedCategories] = useState<RecordCategory[]>([
    RecordCategory.LAB_REPORT,
    RecordCategory.PRESCRIPTION,
  ]);
  const [expiresInDays, setExpiresInDays] = useState(30);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [grantsRes, docsRes, auditRes] = await Promise.all([
        apiClient('/api/consent/my-grants').catch(() => null),
        apiClient('/api/doctors/directory').catch(() => null),
        apiClient('/api/audit/my-logs').catch(() => null),
      ]);

      if (grantsRes?.data) setGrants(grantsRes.data);
      if (docsRes?.data) setDoctors(docsRes.data);
      if (auditRes?.data) setAuditLogs(auditRes.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || allowedCategories.length === 0) return;

    setIsSubmitting(true);
    try {
      await apiClient('/api/consent/grants', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          purpose,
          allowedCategories,
          expiresInDays,
        }),
      });

      setShowGrantModal(false);
      setSelectedDoctorId('');
      await loadData();
      alert('Scoped consent grant issued successfully.');
    } catch (err: any) {
      alert(`Error creating grant: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (grantId: string) => {
    if (!confirm('Are you sure you want to revoke access? This will immediately prevent the doctor from viewing these records.')) {
      return;
    }

    try {
      await apiClient(`/api/consent/grants/${grantId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Revoked by patient via consent portal' }),
      });
      await loadData();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  };

  const toggleCategory = (cat: RecordCategory) => {
    if (allowedCategories.includes(cat)) {
      if (allowedCategories.length === 1) return; // Keep at least one
      setAllowedCategories(allowedCategories.filter((c) => c !== cat));
    } else {
      setAllowedCategories([...allowedCategories, cat]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consent & Medical Record Sharing</h1>
          <p className="text-xs text-slate-500">
            Zero-trust permission boundaries: Define exactly which clinical categories each healthcare provider can access
          </p>
        </div>

        <button
          onClick={() => setShowGrantModal(true)}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Consent Grant</span>
        </button>
      </div>

      {/* Grant Creation Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Grant Doctor Record Access</h2>
              <button onClick={() => setShowGrantModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Healthcare Provider *</label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">Select a Doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.user?.firstName} {d.user?.lastName} — {d.specialties?.[0]?.name || 'Practitioner'} (License: {d.licenseNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Purpose *</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as AccessPurpose)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value={AccessPurpose.DIRECT_CARE}>Direct Clinical Care & Treatment</option>
                  <option value={AccessPurpose.SECOND_OPINION}>Independent Second Opinion</option>
                  <option value={AccessPurpose.DIAGNOSTIC_EVALUATION}>Diagnostic Evaluation</option>
                  <option value={AccessPurpose.SPECIALIST_REFERRAL}>Specialist Referral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Scoped Categories Permitted * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { cat: RecordCategory.LAB_REPORT, label: 'Laboratory Reports' },
                    { cat: RecordCategory.PRESCRIPTION, label: 'Prescriptions' },
                    { cat: RecordCategory.IMAGING, label: 'Imaging & Scans' },
                    { cat: RecordCategory.CONSULTATION_NOTE, label: 'Consultation Notes' },
                    { cat: RecordCategory.DISCHARGE_SUMMARY, label: 'Discharge Summaries' },
                  ].map((item) => (
                    <label
                      key={item.cat}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        allowedCategories.includes(item.cat)
                          ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-semibold'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={allowedCategories.includes(item.cat)}
                        onChange={() => toggleCategory(item.cat)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Access Duration</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                >
                  <option value={7}>7 Days (Short consultation)</option>
                  <option value={30}>30 Days (Standard follow-up)</option>
                  <option value={90}>90 Days (Quarterly management)</option>
                  <option value={365}>1 Year (Primary care)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedDoctorId}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{isSubmitting ? 'Anchoring...' : 'Issue Scoped Grant'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Grants List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">Active & Historical Permissions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grants.map((g) => {
            const isRevoked = g.status === 'REVOKED';
            const isExpired = g.status === 'EXPIRED';
            const isActive = g.status === 'ACTIVE';

            return (
              <div
                key={g.id}
                className={`p-5 rounded-2xl bg-white border shadow-sm space-y-3 ${
                  isActive ? 'border-brand-200' : 'border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Dr. {g.doctor?.user?.firstName} {g.doctor?.user?.lastName}
                    </h3>
                    <div className="text-xs text-brand-700 font-medium">
                      {g.doctor?.specialties?.[0]?.name || 'Cardiologist'} • Purpose: {g.purpose}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? 'bg-teal-50 text-teal-700'
                        : isRevoked
                        ? 'bg-red-50 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {g.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">Permitted Categories:</span>{' '}
                    <span className="text-brand-700 font-mono text-[11px] bg-brand-50 px-2 py-0.5 rounded">
                      {g.allowedCategories}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires: {new Date(g.expiresAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {isActive && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleRevoke(g.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke Access</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {grants.length === 0 && !isLoading && (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-500">
            No active consent grants. You have not shared records with any healthcare provider yet.
          </div>
        )}
      </div>

      {/* Access History Audit Trail (Section 6 & 13) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">Security & Access Audit Trail</h2>
          </div>
          <span className="text-xs text-slate-400">Immutable Access Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                <th className="py-2.5 px-3 font-semibold">Actor</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold">Resource</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Emergency Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {log.actorUser?.firstName} {log.actorUser?.lastName} ({log.actorUser?.role})
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-semibold">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-500">{log.resourceType}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {log.isEmergencyOverride ? (
                      <span className="text-red-600 font-bold text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>BREAK-GLASS OVERRIDE</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Standard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {auditLogs.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">No access audit events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

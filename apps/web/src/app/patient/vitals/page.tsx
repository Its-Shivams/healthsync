'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Heart,
  Droplet,
  Activity,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Info,
  Clock,
  Scale,
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

export default function DailyVitalsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Route protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [bloodSugarFasting, setBloodSugarFasting] = useState('');
  const [bloodSugarPostPrandial, setBloodSugarPostPrandial] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');

  const loadVitalsData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient('/api/patients/daily-health-logs');
      if (res.data) {
        setLogs(res.data.logs || []);
        setSummary(res.data.summary || null);
      }
    } catch (err: any) {
      console.error('Failed to load vitals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVitalsData();
  }, []);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient('/api/patients/daily-health-logs', {
        method: 'POST',
        body: JSON.stringify({
          logDate,
          bloodPressureSystolic: bpSystolic ? Number(bpSystolic) : null,
          bloodPressureDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
          bloodSugarFasting: bloodSugarFasting ? Number(bloodSugarFasting) : null,
          bloodSugarPostPrandial: bloodSugarPostPrandial ? Number(bloodSugarPostPrandial) : null,
          heartRateBpm: heartRate ? Number(heartRate) : null,
          weightKg: weightKg ? Number(weightKg) : null,
          notes: notes.trim() || null,
        }),
      });

      setShowAddModal(false);
      // Reset form
      setBpSystolic('');
      setBpDiastolic('');
      setBloodSugarFasting('');
      setBloodSugarPostPrandial('');
      setHeartRate('');
      setWeightKg('');
      setNotes('');
      await loadVitalsData();
      alert('Daily vitals metric recorded successfully!');
    } catch (err: any) {
      alert(`Failed to save log: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vital log entry?')) return;
    try {
      await apiClient(`/api/patients/daily-health-logs/${id}`, { method: 'DELETE' });
      await loadVitalsData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Prepare chronological chart data
  const chartData = [...logs]
    .reverse()
    .map((l) => ({
      date: new Date(l.logDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      systolic: l.bloodPressureSystolic || null,
      diastolic: l.bloodPressureDiastolic || null,
      fastingSugar: l.bloodSugarFasting || null,
      ppSugar: l.bloodSugarPostPrandial || null,
      heartRate: l.heartRateBpm || null,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-700 via-brand-700 to-indigo-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 text-rose-300" />
            <span>Daily Health Monitoring & Averages</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold">
            Daily Vitals, Blood Pressure & Blood Sugar Tracker
          </h1>
          <p className="text-xs md:text-sm text-slate-200">
            Log daily measurements, monitor metabolic fluctuations, and track rolling averages over time.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-white text-brand-700 hover:bg-slate-100 text-xs font-bold shadow-md flex items-center gap-2 transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Today&#39;s Vitals</span>
        </button>
      </div>

      {/* Calculated Averages Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Blood Pressure Average Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Average Blood Pressure</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.avgSystolic ? `${summary.avgSystolic} / ${summary.avgDiastolic}` : '---'}
            <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-rose-700 bg-rose-50/70 px-2 py-1 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{summary?.bpCategory || 'No data recorded yet'}</span>
          </div>
        </div>

        {/* Fasting Sugar Average Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Avg Fasting Blood Sugar</span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.avgFastingSugar ? summary.avgFastingSugar : '---'}
            <span className="text-xs font-normal text-slate-500 ml-1">mg/dL</span>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-teal-700 bg-teal-50/70 px-2 py-1 rounded-lg">
            <Info className="w-3.5 h-3.5" />
            <span>{summary?.sugarCategory || 'Target: 70-99 mg/dL'}</span>
          </div>
        </div>

        {/* Post-Prandial Sugar Average Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Avg Post-Meal Sugar</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.avgPostPrandialSugar ? summary.avgPostPrandialSugar : '---'}
            <span className="text-xs font-normal text-slate-500 ml-1">mg/dL</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Standard 2hr Post-Meal Reference: &lt; 140 mg/dL
          </div>
        </div>

        {/* Resting Heart Rate & Weight Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Avg Heart Rate & Weight</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary?.avgHeartRate ? summary.avgHeartRate : '---'}
            <span className="text-xs font-normal text-slate-500 ml-1">BPM</span>
            {summary?.avgWeight && (
              <span className="text-sm font-semibold text-slate-600 ml-2">
                • {summary.avgWeight} kg
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 pt-1">
            Total Logged Days: <strong>{summary?.totalEntries || 0} entries</strong>
          </div>
        </div>
      </div>

      {/* Graphical Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Pressure Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Blood Pressure Daily Trend</h2>
              <p className="text-xs text-slate-500">Systolic & Diastolic tracking across logged days</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
              Target: &lt; 120/80 mmHg
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 180]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    name="Systolic (mmHg)"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    name="Diastolic (mmHg)"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No blood pressure logs recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Blood Sugar Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Blood Glucose Daily Trend</h2>
              <p className="text-xs text-slate-500">Fasting vs. Post-Prandial Glycemic Levels</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">
              Target Fasting: 70-99 mg/dL
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[60, 240]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="fastingSugar"
                    name="Fasting Sugar (mg/dL)"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ppSugar"
                    name="Post-Meal Sugar (mg/dL)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No blood sugar logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Logs Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily Log History & Clinical Diary</h2>
            <p className="text-xs text-slate-500">
              Chronological log of all daily health reports with symptoms, timing, and actions
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Entry</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Blood Pressure</th>
                <th className="py-2.5 px-3 font-semibold">Fasting Sugar</th>
                <th className="py-2.5 px-3 font-semibold">Post-Meal Sugar</th>
                <th className="py-2.5 px-3 font-semibold">Heart Rate</th>
                <th className="py-2.5 px-3 font-semibold">Weight</th>
                <th className="py-2.5 px-3 font-semibold">Notes / Symptoms</th>
                <th className="py-2.5 px-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(log.logDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </td>
                    <td className="py-3 px-3">
                      {log.bloodPressureSystolic && log.bloodPressureDiastolic ? (
                        <span
                          className={`font-semibold ${
                            log.bloodPressureSystolic >= 135 || log.bloodPressureDiastolic >= 88
                              ? 'text-rose-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {log.bloodPressureSystolic} / {log.bloodPressureDiastolic} mmHg
                        </span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.bloodSugarFasting ? (
                        <span
                          className={`font-semibold ${
                            log.bloodSugarFasting >= 126
                              ? 'text-rose-600'
                              : log.bloodSugarFasting >= 100
                              ? 'text-amber-600'
                              : 'text-teal-700'
                          }`}
                        >
                          {log.bloodSugarFasting} mg/dL
                        </span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.bloodSugarPostPrandial ? (
                        <span
                          className={`font-semibold ${
                            log.bloodSugarPostPrandial >= 180
                              ? 'text-rose-600'
                              : log.bloodSugarPostPrandial >= 140
                              ? 'text-amber-600'
                              : 'text-teal-700'
                          }`}
                        >
                          {log.bloodSugarPostPrandial} mg/dL
                        </span>
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {log.heartRateBpm ? `${log.heartRateBpm} bpm` : '---'}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {log.weightKg ? `${log.weightKg} kg` : '---'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {log.notes || '---'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete this vital entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No daily health metrics logged yet. Click &quot;Record Today&#39;s Vitals&quot; above to start tracking!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Today's Vitals Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Log Daily Health Report</h3>
                  <p className="text-[11px] text-slate-500">Record your blood pressure, sugar & vitals</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Log Date
                </label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* BP Systolic / Diastolic */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="260"
                    placeholder="e.g. 120"
                    value={bpSystolic}
                    onChange={(e) => setBpSystolic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="160"
                    placeholder="e.g. 80"
                    value={bpDiastolic}
                    onChange={(e) => setBpDiastolic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sugar Fasting / Post-Meal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fasting Blood Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="600"
                    placeholder="e.g. 95.0"
                    value={bloodSugarFasting}
                    onChange={(e) => setBloodSugarFasting(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Post-Prandial Sugar (mg/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="600"
                    placeholder="e.g. 130.0"
                    value={bloodSugarPostPrandial}
                    onChange={(e) => setBloodSugarPostPrandial(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pulse / Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    min="40"
                    max="220"
                    placeholder="e.g. 72"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    placeholder="e.g. 72.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes & Symptoms (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Taken 30 mins after breakfast, felt slightly dizzy during morning walk..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Daily Metric'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

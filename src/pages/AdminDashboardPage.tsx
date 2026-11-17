import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Package,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  AdminActivityLog,
  DisputeReport,
  DisputeStatus,
  Item,
  PlatformStats,
  Profile,
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ImageWithFallback } from '../components/ImageWithFallback';
import type { AppView } from '../components/Navbar';

interface AdminDashboardPageProps {
  onNavigate: (view: AppView) => void;
}

type AdminTab = 'overview' | 'students' | 'listings' | 'disputes';

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [students, setStudents] = useState<
    Array<Profile & { listingCount: number; exchangeCount: number }>
  >([]);
  const [items, setItems] = useState<Item[]>([]);
  const [disputes, setDisputes] = useState<DisputeReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected dispute review state
  const [activeDispute, setActiveDispute] = useState<DisputeReport | null>(null);
  const [reviewStatus, setReviewStatus] = useState<DisputeStatus>('Under Review');
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    try {
      const [overviewRes, studentsRes, itemsRes, disputesRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminStudents(),
        api.getItems(),
        api.getDisputes(),
      ]);
      setStats(overviewRes.stats);
      setLogs(overviewRes.activityLogs);
      setStudents(studentsRes.students);
      setItems(itemsRes.items);
      setDisputes(disputesRes.disputes);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load admin console.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[#172554]">
          Authorized Administrators Only
        </h1>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          This area is restricted to verified campus administrators. Sign in with an admin account to review disputes and manage listings.
        </p>
        <button
          type="button"
          onClick={() => onNavigate(user ? 'dashboard' : 'login')}
          className="px-6 py-2.5 rounded-xl bg-[#172554] text-white text-sm font-semibold"
        >
          {user ? 'Return to Student Dashboard' : 'Go to Login'}
        </button>
      </div>
    );
  }

  const handleStudentStatus = async (
    studentId: string,
    status: 'Verified' | 'Pending' | 'Suspended'
  ) => {
    try {
      await api.updateStudentStatus(studentId, status);
      showToast(`Student verification status updated to ${status}.`, 'success');
      void loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed.', 'error');
    }
  };

  const handleDeleteListing = async (itemId: string) => {
    try {
      await api.deleteItem(itemId);
      showToast('Listing removed by moderation.', 'success');
      void loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete listing.', 'error');
    }
  };

  const openDisputeReview = (dispute: DisputeReport) => {
    setActiveDispute(dispute);
    setReviewStatus(dispute.status);
    setAdminNotes(dispute.adminNotes);
    setResolutionSummary(dispute.resolutionSummary);
  };

  const handleSaveDisputeReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDispute) return;
    try {
      await api.updateDispute(activeDispute.id, {
        status: reviewStatus,
        adminNotes,
        resolutionSummary,
      });
      showToast(`Dispute updated to ${reviewStatus}.`, 'success');
      setActiveDispute(null);
      void loadAdminData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update dispute.', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
            REVA SWAP Admin Console
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Campus moderation, student verification, listings oversight, and neutral dispute resolution.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Activity' },
              { id: 'students', label: 'Students' },
              { id: 'listings', label: 'Listings' },
              { id: 'disputes', label: 'Disputes' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-white text-[#172554] shadow-xs' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Admin KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Registered Students</span>
            <Users className="h-4 w-4 text-[#172554]" />
          </div>
          <p className="font-display text-2xl font-bold text-[#172554] tabular-nums">
            {stats?.totalStudents ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Listings</span>
            <Package className="h-4 w-4 text-[#6D5CE7]" />
          </div>
          <p className="font-display text-2xl font-bold text-[#172554] tabular-nums">
            {stats?.totalItems ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Active Exchanges</span>
            <Activity className="h-4 w-4 text-[#14B8A6]" />
          </div>
          <p className="font-display text-2xl font-bold text-[#14B8A6] tabular-nums">
            {stats?.activeExchanges ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Pending Disputes</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-display text-2xl font-bold text-amber-700 tabular-nums">
            {stats?.pendingDisputes ?? '—'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          Loading administrative records...
        </div>
      ) : (
        <>
          {/* ACTIVITY TAB */}
          {tab === 'overview' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-display text-lg font-semibold text-[#172554] mb-4">
                Recent Platform Activity
              </h2>
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{log.actorName}</span>{' '}
                      <span className="text-slate-600">{log.action}</span>{' '}
                      <span className="font-medium text-[#172554]">“{log.target}”</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STUDENTS TAB */}
          {tab === 'students' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-x-auto">
              <h2 className="font-display text-lg font-semibold text-[#172554] mb-4">
                Manage Students
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 pr-4 font-medium">Student</th>
                    <th className="py-2.5 px-4 font-medium">ID</th>
                    <th className="py-2.5 px-4 font-medium">Department</th>
                    <th className="py-2.5 px-4 font-medium">Listings</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 pl-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st) => (
                    <tr key={st.id}>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{st.fullName}</p>
                        <p className="text-xs text-slate-500">{st.email}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums">{st.studentId}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {st.department} · {st.yearOfStudy}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums">
                        {st.listingCount}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        <span
                          className={
                            st.verificationStatus === 'Verified'
                              ? 'text-[#0F766E]'
                              : st.verificationStatus === 'Suspended'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }
                        >
                          {st.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-right space-x-2 whitespace-nowrap">
                        {st.verificationStatus !== 'Verified' && (
                          <button
                            type="button"
                            onClick={() => handleStudentStatus(st.id, 'Verified')}
                            className="px-2.5 py-1 rounded-lg bg-[#14B8A6] text-white text-xs font-semibold"
                          >
                            Verify
                          </button>
                        )}
                        {st.verificationStatus !== 'Suspended' ? (
                          <button
                            type="button"
                            onClick={() => handleStudentStatus(st.id, 'Suspended')}
                            className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 text-xs font-semibold"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStudentStatus(st.id, 'Verified')}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold"
                          >
                            Reinstate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LISTINGS TAB */}
          {tab === 'listings' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-x-auto">
              <h2 className="font-display text-lg font-semibold text-[#172554] mb-4">
                Manage Campus Listings
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 pr-4 font-medium">Item</th>
                    <th className="py-2.5 px-4 font-medium">Owner</th>
                    <th className="py-2.5 px-4 font-medium">Type</th>
                    <th className="py-2.5 px-4 font-medium">Availability</th>
                    <th className="py-2.5 pl-4 font-medium text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-4 font-medium text-slate-900">{item.title}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{item.owner?.fullName}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{item.exchangeType}</td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">
                        {item.availability}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteListing(item.id)}
                          className="px-3 py-1 rounded-lg border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* DISPUTES TAB */}
          {tab === 'disputes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#172554]">
                  Dispute Reports Queue
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review evidence neutrally and communicate resolution notes without automated penalties.
                </p>
              </div>

              {disputes.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No disputes filed.</p>
              ) : (
                <div className="space-y-4">
                  {disputes.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-200 p-5 bg-[#F8FAFC] flex flex-col md:flex-row md:items-start justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#6D5CE7]">
                          {d.category} · Status:{' '}
                          <span className="text-[#172554]">{d.status}</span> ·{' '}
                          <span className="font-mono text-slate-500 tabular-nums">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                        <h3 className="font-display text-base font-bold text-slate-900">
                          {d.item?.title || 'Reported Item'}
                        </h3>
                        <p className="text-xs text-slate-600">
                          Reported by: <span className="font-medium">{d.reporter?.fullName}</span>
                          {d.reportedUser && ` · Counterparty: ${d.reportedUser.fullName}`}
                        </p>
                        <p className="text-sm text-slate-700">{d.description}</p>

                        {d.photoUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {d.photoUrls.map((url, idx) => (
                              <div
                                key={idx}
                                className="w-20 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white"
                              >
                                <ImageWithFallback
                                  src={url}
                                  alt={`Evidence ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openDisputeReview(d)}
                        className="px-4 py-2 rounded-xl bg-[#172554] hover:bg-[#1e3270] text-white text-xs font-semibold whitespace-nowrap shrink-0 self-start"
                      >
                        Review & Update Status
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Dispute Resolution Modal */}
      {activeDispute && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6">
            <h2 className="font-display text-lg font-bold text-[#172554]">
              Review Dispute Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeDispute.category} · {activeDispute.item?.title}
            </p>

            <form onSubmit={handleSaveDisputeReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Dispute Status
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as DisputeStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Internal Admin Investigation Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Evidence checked, condition photos compared..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Neutral Resolution Summary (Visible to Reporter)
                </label>
                <textarea
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Describe agreed outcome or follow-up steps neutrally..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDispute(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#172554] text-white text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

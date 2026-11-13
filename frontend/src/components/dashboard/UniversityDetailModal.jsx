import { useState, useEffect } from 'react';
import dashboardService from '../../services/dashboardService';
import {
  Building2,
  X,
  Loader2,
  Layers,
  Users,
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function UniversityDetailModal({ universityId, date, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await dashboardService.getUniversityDashboard(universityId, { date });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load university dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (universityId) {
      fetchDetail();
    }
  }, [universityId, date]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl border border-brand-200 bg-white p-6 shadow-xl my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white font-bold text-sm">
              {data?.university?.code || 'UNI'}
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-900">
                {data?.university?.name || 'University Dashboard'}
              </h2>
              <p className="text-xs text-brand-500">
                {data?.university?.location} &bull; Target Date: {date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-brand-500">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600 mb-2" />
              <p className="text-xs">Loading university metrics...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Stat Overview Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-lg border border-brand-200 bg-white p-3 text-center shadow-xs">
                  <p className="text-[11px] font-medium text-brand-500">Total Sections</p>
                  <p className="text-lg font-bold text-brand-900 mt-1">
                    {data.totals?.sectionsCount || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-brand-200 bg-white p-3 text-center shadow-xs">
                  <p className="text-[11px] font-medium text-brand-500">Enrolled Students</p>
                  <p className="text-lg font-bold text-brand-900 mt-1">
                    {data.totals?.studentsCount || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 text-center shadow-xs">
                  <p className="text-[11px] font-medium text-emerald-800">Present Today</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">
                    {data.totals?.presentCount || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-center shadow-xs">
                  <p className="text-[11px] font-medium text-amber-800">Late Today</p>
                  <p className="text-lg font-bold text-amber-700 mt-1">
                    {data.totals?.lateCount || 0}
                  </p>
                </div>
                <div className="rounded-lg border border-brand-200 bg-white p-3 text-center shadow-xs col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-medium text-brand-500">Attendance Rate</p>
                  <p className="text-lg font-bold text-brand-900 mt-1">
                    {data.totals?.overallPercentage || 0}%
                  </p>
                </div>
              </div>

              {/* Section Breakdown Table */}
              <div>
                <h3 className="text-xs font-semibold text-brand-900 mb-2">
                  Section Attendance Breakdown
                </h3>
                <div className="overflow-hidden rounded-lg border border-brand-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-brand-200 bg-brand-50 text-brand-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Section</th>
                        <th className="py-2.5 px-3">Term</th>
                        <th className="py-2.5 px-3">Assigned Coach</th>
                        <th className="py-2.5 px-3 text-center">Students</th>
                        <th className="py-2.5 px-3 text-center">Present / Late / Absent</th>
                        <th className="py-2.5 px-3 text-right">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100 text-brand-800">
                      {data.sectionsBreakdown?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-brand-400">
                            No sections registered for this university.
                          </td>
                        </tr>
                      ) : (
                        data.sectionsBreakdown?.map((sec) => (
                          <tr key={sec.id} className="hover:bg-brand-50/50">
                            <td className="py-2.5 px-3 font-semibold text-brand-900">
                              {sec.name}
                            </td>
                            <td className="py-2.5 px-3 text-brand-600">
                              {sec.semester}
                            </td>
                            <td className="py-2.5 px-3 text-brand-700">
                              {sec.assignedCoaches?.length > 0
                                ? sec.assignedCoaches.map((c) => c.name).join(', ')
                                : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium">
                              {sec.studentCount}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {sec.isSubmitted ? (
                                <span className="font-mono text-[11px]">
                                  <span className="text-emerald-700 font-semibold">{sec.presentCount}</span> /{' '}
                                  <span className="text-amber-700 font-semibold">{sec.lateCount || 0}</span> /{' '}
                                  <span className="text-red-700 font-semibold">{sec.absentCount}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-brand-900">
                              {sec.isSubmitted ? `${sec.percentage}%` : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-brand-100 pt-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

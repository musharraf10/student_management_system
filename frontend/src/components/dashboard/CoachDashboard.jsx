import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import {
  Layers,
  Users,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function CoachDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getDashboardStats({ date });
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load coach metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [date]);

  const totals = data?.totals || {};

  return (
    <div className="space-y-6">
      {/* Date Filter & Status Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div>
          <h2 className="text-base font-bold text-brand-900">
            Success Coach Dashboard
          </h2>
          <p className="text-xs text-brand-500">
            Performance and classroom tracking for your assigned sections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-brand-600">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white py-1.5 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Pending Attendance Warning if any assigned section is pending */}
      {totals.pendingCount > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                Attendance Pending for {totals.pendingCount} Section(s)
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {data?.pendingSections?.map((s) => s.name).join(', ')} have not submitted attendance for {date}.
              </p>
            </div>
          </div>
          <Link
            to="/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-800 transition-colors shrink-0"
          >
            <span>Mark Attendance Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-brand-500">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600 mb-2" />
          <p className="text-xs">Loading classroom metrics...</p>
        </div>
      ) : (
        <>
          {/* Key Stat Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Assigned Sections</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.assignedSectionsCount || 0}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Total Students</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.totalStudents || 0}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-medium text-emerald-800">Present Today</span>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {totals.present || 0}
              </p>
            </div>

            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 shadow-xs">
              <span className="text-[11px] font-medium text-amber-800">Late Today</span>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {totals.late || 0}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-medium text-red-800">Absent Today</span>
              <p className="mt-1 text-2xl font-bold text-red-700">
                {totals.absent || 0}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Pending Sections</span>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {totals.pendingCount || 0}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Attendance Rate</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.attendancePercentage || 0}%
              </p>
            </div>
          </div>

          {/* Assigned Sections Overview */}
          <div className="rounded-xl border border-brand-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-brand-900">
              My Assigned Sections
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data?.assignedSections?.length === 0 ? (
                <p className="text-xs text-brand-400">No sections assigned yet.</p>
              ) : (
                data?.assignedSections?.map((sec) => (
                  <div
                    key={sec._id}
                    className="flex flex-col justify-between rounded-lg border border-brand-200 bg-brand-50/50 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-brand-900">
                          {sec.name}
                        </span>
                        <span className="rounded bg-brand-100 px-2 py-0.5 font-mono text-[10px] text-brand-700 font-medium">
                          {sec.code}
                        </span>
                      </div>
                      <p className="text-xs text-brand-600 mt-1">
                        {sec.university?.name}
                      </p>
                      <p className="text-[11px] text-brand-400 mt-0.5">
                        {sec.academicYear} &bull; {sec.semester}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-brand-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-brand-500">Classroom Action</span>
                      <Link
                        to="/attendance"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900"
                      >
                        <span>Mark Attendance</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Attendance Activity for Coach */}
          <div className="rounded-xl border border-brand-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-brand-900 mb-3">
              Recent Attendance History
            </h3>

            <div className="divide-y divide-brand-100">
              {data?.recentHistory?.length === 0 ? (
                <p className="text-xs text-brand-400 py-3">No attendance submitted yet.</p>
              ) : (
                data?.recentHistory?.map((hist) => (
                  <div
                    key={hist._id}
                    className="flex items-center justify-between py-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700 font-bold text-xs">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-brand-900">
                          {hist.section?.name}
                        </span>
                        <span className="text-brand-400 mx-2">&bull;</span>
                        <span className="text-brand-500">
                          {new Date(hist.date).toLocaleDateString()}
                        </span>
                        <span className="text-brand-400 mx-2">&bull;</span>
                        <span className="capitalize font-mono text-brand-600 text-[11px]">
                          {hist.dayType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="font-mono text-xs">
                      P: <strong className="text-emerald-700">{hist.presentCount}</strong> | A:{' '}
                      <strong className="text-red-700">{hist.absentCount}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import attendanceService from '../../services/attendanceService';
import reportService from '../../services/reportService';
import {
  User,
  Building2,
  Layers,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Briefcase,
  Loader2,
  Filter,
  GraduationCap,
  Download,
} from 'lucide-react';

export default function StudentAttendanceDetailPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Filters
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(''); // '' = All Months, '1'..'12'

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedYear) params.year = selectedYear;
      if (selectedMonth) params.month = selectedMonth;

      const res = await attendanceService.getStudentAttendance(id, params);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student attendance record');
    } finally {
      setLoading(false);
    }
  };

  const handleExportStudentReport = async () => {
    try {
      setDownloadingReport(true);
      await reportService.downloadStudentReport({
        studentId: id,
        year: selectedYear || undefined,
        month: selectedMonth || undefined,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download student attendance report');
    } finally {
      setDownloadingReport(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchStudentData();
    }
  }, [id, selectedYear, selectedMonth]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
        <Link
          to="/students"
          className="inline-flex items-center gap-2 text-xs font-medium text-brand-600 hover:text-brand-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Students Directory</span>
        </Link>
      </div>
    );
  }

  const { student, summary, history = [] } = data || {};

  // Status badge styling helper
  const renderStatusBadge = (status, dayType) => {
    if (dayType === 'sunday') {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-300">
          Sunday
        </span>
      );
    }
    if (dayType === 'holiday') {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
          Holiday
        </span>
      );
    }

    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Present
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-300">
            <Clock className="h-3 w-3 text-amber-600" />
            Late
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-800 border border-red-200">
            <XCircle className="h-3 w-3 text-red-600" />
            Absent
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-800 border border-purple-200">
            <Calendar className="h-3 w-3 text-purple-600" />
            Leave
          </span>
        );
      case 'on_duty':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 border border-teal-200">
            <Briefcase className="h-3 w-3 text-teal-600" />
            On Duty
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            Not Recorded
          </span>
        );
    }
  };

  const months = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-2 text-xs text-brand-500">
          <Link to="/dashboard" className="hover:text-brand-900">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/students" className="hover:text-brand-900">
            Students
          </Link>
          <span>/</span>
          <span className="font-semibold text-brand-900">
            {student?.name || 'Student Attendance'}
          </span>
        </nav>

        <Link
          to="/attendance"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Daily Attendance Sheet</span>
        </Link>
      </div>

      {/* STUDENT PROFILE CARD */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 bg-brand-50/60 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white font-bold text-base shadow-xs">
                {student?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <h1 className="text-lg font-bold text-brand-900">{student?.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-brand-500 mt-0.5">
                  <span className="font-mono">
                    Roll No: <strong className="text-brand-800">{student?.rollNumber}</strong>
                  </span>
                  <span>•</span>
                  <span className="font-mono">
                    NIAT ID: <strong className="text-brand-800">{student?.niatId}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportStudentReport}
                disabled={downloadingReport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition disabled:opacity-50"
              >
                {downloadingReport ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                )}
                <span>{downloadingReport ? 'Exporting...' : 'Export Excel'}</span>
              </button>

              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  student?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {student?.status === 'active' ? 'Active Enrolled' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="flex items-start gap-2.5">
            <Building2 className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-400 font-medium">University</p>
              <p className="font-semibold text-brand-900 mt-0.5">
                {student?.university?.name} ({student?.university?.code})
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Layers className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-400 font-medium">Section</p>
              <p className="font-semibold text-brand-900 mt-0.5">
                {student?.section?.name} ({student?.section?.code})
              </p>
              <p className="text-[11px] text-brand-400">
                Sem {student?.section?.semester || '1'} • {student?.section?.academicYear || '2026-2027'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Phone className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-400 font-medium">Student Phone</p>
              <p className="font-semibold text-brand-900 mt-0.5 font-mono">
                {student?.studentPhone || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <User className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-400 font-medium">Parent Contact</p>
              <p className="font-semibold text-brand-900 mt-0.5">
                {student?.parentName || 'N/A'}
              </p>
              <p className="text-[11px] text-brand-400 font-mono">
                {student?.parentPhone || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTENDANCE SUMMARY STATS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-brand-900">Attendance Summary Metrics</h2>
          <span className="text-xs text-brand-500">
            Calculated via centralized institutional formula
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {/* Attendance % */}
          <div className="rounded-xl border border-brand-200 bg-white p-3.5 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-[11px] font-medium text-brand-500">Attendance %</p>
            <p
              className={`mt-1 text-2xl font-black ${
                (summary?.percentage || 0) >= 75
                  ? 'text-emerald-600'
                  : (summary?.percentage || 0) >= 65
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}
            >
              {summary?.percentage ?? 0}%
            </p>
            <p className="text-[10px] text-brand-400 mt-0.5">Threshold: 75%</p>
          </div>

          {/* Working Days */}
          <div className="rounded-xl border border-brand-200 bg-white p-3.5 shadow-xs">
            <p className="text-[11px] font-medium text-brand-500">Working Days</p>
            <p className="mt-1 text-xl font-bold text-brand-900">
              {summary?.workingDays ?? 0}
            </p>
            <p className="text-[10px] text-brand-400 mt-0.5">Total Days: {summary?.totalDays ?? 0}</p>
          </div>

          {/* Present */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-xs">
            <p className="text-[11px] font-medium text-emerald-800">Present Days</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              {summary?.presentDays ?? 0}
            </p>
          </div>

          {/* Late Days */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 shadow-xs">
            <p className="text-[11px] font-medium text-amber-800">Late Days</p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              {summary?.lateDays ?? 0}
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5">Counts in %</p>
          </div>

          {/* Absent */}
          <div className="rounded-xl border border-red-200 bg-red-50/40 p-3.5 shadow-xs">
            <p className="text-[11px] font-medium text-red-800">Absent Days</p>
            <p className="mt-1 text-xl font-bold text-red-700">
              {summary?.absentDays ?? 0}
            </p>
          </div>

          {/* Leave */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 shadow-xs">
            <p className="text-[11px] font-medium text-purple-800">Leave Days</p>
            <p className="mt-1 text-xl font-bold text-purple-700">
              {summary?.leaveDays ?? 0}
            </p>
          </div>

          {/* On Duty */}
          <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 shadow-xs">
            <p className="text-[11px] font-medium text-teal-800">On Duty (OD)</p>
            <p className="mt-1 text-xl font-bold text-teal-700">
              {summary?.onDutyDays ?? 0}
            </p>
          </div>

          {/* Holidays & Sundays */}
          <div className="rounded-xl border border-brand-200 bg-white p-3.5 shadow-xs">
            <p className="text-[11px] font-medium text-brand-500">Holidays / Sun</p>
            <p className="mt-1 text-xl font-bold text-brand-800">
              {(summary?.holidays || 0) + (summary?.sundays || 0)}
            </p>
            <p className="text-[10px] text-brand-400 mt-0.5">
              H: {summary?.holidays || 0} • S: {summary?.sundays || 0}
            </p>
          </div>
        </div>
      </div>

      {/* FILTER BAR & ATTENDANCE HISTORY TABLE */}
      <div className="space-y-3">
        {/* Filter Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-900">
            <Filter className="h-4 w-4 text-brand-500" />
            <span>Attendance History Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-lg border border-brand-200 bg-white py-1.5 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-lg border border-brand-200 bg-white py-1.5 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              >
                <option value="2026">Year 2026</option>
                <option value="2025">Year 2025</option>
                <option value="2027">Year 2027</option>
              </select>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-200 bg-brand-50 text-brand-700 font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Day of Week</th>
                  <th className="py-3 px-4">Day Type</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Remarks / Holiday Reason</th>
                  <th className="py-3 px-4">Updated By</th>
                  <th className="py-3 px-4 text-right">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 text-brand-800">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-brand-500">
                      <Calendar className="mx-auto h-7 w-7 text-brand-300" />
                      <span className="mt-2 block text-xs">
                        No attendance records found for the selected period
                      </span>
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr
                      key={item._id}
                      className={`hover:bg-brand-50/60 transition-colors ${
                        item.dayType === 'sunday'
                          ? 'bg-slate-50/40 text-slate-600'
                          : item.dayType === 'holiday'
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-brand-900">
                        {new Date(item.date).toISOString().split('T')[0]}
                      </td>
                      <td className="py-3 px-4 font-medium text-brand-700">
                        {item.dayOfWeek}
                      </td>
                      <td className="py-3 px-4">
                        {item.dayType === 'online_class' ? (
                          <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-800 border border-cyan-200">
                            Online Class
                          </span>
                        ) : item.dayType === 'sunday' ? (
                          <span className="text-slate-500 font-medium">Institutional Sunday</span>
                        ) : item.dayType === 'holiday' ? (
                          <span className="text-amber-800 font-medium">Declared Holiday</span>
                        ) : (
                          <span className="text-brand-600">Working Day</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(item.status, item.dayType)}
                      </td>
                      <td className="py-3 px-4 text-brand-600">
                        {item.holidayReason ? (
                          <span className="italic text-amber-900">{item.holidayReason}</span>
                        ) : (
                          item.remarks || '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-brand-500">
                        {item.updatedBy?.name || 'System / Coach'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-brand-400">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

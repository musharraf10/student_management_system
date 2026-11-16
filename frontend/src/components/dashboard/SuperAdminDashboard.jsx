import { useState, useEffect } from 'react';
import dashboardService from '../../services/dashboardService';
import universityService from '../../services/universityService';
import sectionService from '../../services/sectionService';
import UniversityDetailModal from './UniversityDetailModal';
import {
  Building2,
  Layers,
  UserCheck,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Search,
  ExternalLink,
  Loader2,
  Clock,
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');

  // University Detail Modal
  const [detailUniId, setDetailUniId] = useState(null);

  const fetchFilters = async () => {
    try {
      const [uRes, sRes] = await Promise.all([
        universityService.getUniversities(),
        sectionService.getSections(),
      ]);
      setUniversities(uRes.data || []);
      setSections(sRes.data || []);
    } catch (err) {
      console.error('Filter options load failed:', err);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = {};
      if (date) params.date = date;
      if (selectedUniversity) params.university = selectedUniversity;
      if (selectedSection) params.section = selectedSection;
      if (academicYear) params.academicYear = academicYear;
      if (semester) params.semester = semester;

      const res = await dashboardService.getDashboardStats(params);
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [date, selectedUniversity, selectedSection, academicYear, semester]);

  const totals = data?.totals || {};

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <label className="block text-[11px] font-medium text-brand-600 mb-1">
              Date Filter
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-lg border border-brand-200 bg-white py-1.5 px-2.5 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-brand-600 mb-1">
              University
            </label>
            <select
              value={selectedUniversity}
              onChange={(e) => {
                setSelectedUniversity(e.target.value);
                setSelectedSection('');
              }}
              className="block w-full rounded-lg border border-brand-200 bg-white py-1.5 px-2.5 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
            >
              <option value="">All Universities</option>
              {universities.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-brand-600 mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="block w-full rounded-lg border border-brand-200 bg-white py-1.5 px-2.5 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
            >
              <option value="">All Sections</option>
              {sections
                .filter(
                  (s) =>
                    !selectedUniversity ||
                    s.university?._id === selectedUniversity ||
                    s.university === selectedUniversity
                )
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-brand-600 mb-1">
              Academic Year
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g., 2025-2026"
              className="block w-full rounded-lg border border-brand-200 bg-white py-1.5 px-2.5 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-brand-600 mb-1">
              Semester Term
            </label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g., Semester 1"
              className="block w-full rounded-lg border border-brand-200 bg-white py-1.5 px-2.5 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-brand-500">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600 mb-2" />
          <p className="text-xs">Loading ecosystem metrics...</p>
        </div>
      ) : (
        <>
          {/* Primary Top Metric Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Universities</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.universities || 0}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Tot. Sec</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.sections || 0}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">SC's</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.coaches || 0}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Students</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.students || 0}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-medium text-emerald-800">Present</span>
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
              <span className="text-[11px] font-medium text-red-800">Absent</span>
              <p className="mt-1 text-2xl font-bold text-red-700">
                {totals.absent || 0}
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-brand-500">Attendance %</span>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {totals.attendancePercentage || 0}%
              </p>
            </div>
          </div>

          {/* University Comparisons Section */}
          <div className="rounded-xl border border-brand-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-900">
                  University-Wise Attendance Comparison
                </h2>
                <p className="text-xs text-brand-500 mt-0.5">
                  Institutional performance breakdown on {date}. Click any row to view section details.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-brand-200 bg-brand-50 text-brand-700 font-semibold">
                  <tr>
                    <th className="py-3 px-4">University</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Active Sections</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4 text-center">Present / Late / Absent</th>
                    <th className="py-3 px-4 text-right">Attendance Rate</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100 text-brand-800">
                  {data?.universityComparisons?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-brand-400">
                        No universities found.
                      </td>
                    </tr>
                  ) : (
                    data?.universityComparisons?.map((uni) => (
                      <tr
                        key={uni.id}
                        className="hover:bg-brand-50/60 transition-colors cursor-pointer"
                        onClick={() => setDetailUniId(uni.id)}
                      >
                        <td className="py-3 px-4 font-semibold text-brand-900 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-brand-500 shrink-0" />
                          <span>{uni.name}</span>
                          <span className="rounded bg-brand-100 px-1.5 py-0.2 font-mono text-[10px] text-brand-700">
                            {uni.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-brand-600">{uni.location}</td>
                        <td className="py-3 px-4 text-center font-medium">
                          {uni.sectionsCount}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {uni.studentsCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="text-emerald-700 font-bold">{uni.presentCount}</span> /{' '}
                          <span className="text-amber-700 font-bold">{uni.lateCount || 0}</span> /{' '}
                          <span className="text-red-700 font-bold">{uni.absentCount}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 font-semibold text-brand-900">
                            {uni.percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailUniId(uni.id);
                            }}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
                          >
                            <span>Details</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Attendance Submissions Feed */}
          <div className="rounded-xl border border-brand-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-brand-900 mb-3">
              Recent System Submissions
            </h3>
            <div className="divide-y divide-brand-100">
              {data?.recentSubmissions?.length === 0 ? (
                <p className="text-xs text-brand-400 py-3">No submissions recorded yet.</p>
              ) : (
                data?.recentSubmissions?.map((sub) => (
                  <div
                    key={sub._id}
                    className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-brand-900">
                        {sub.section?.name} ({sub.section?.code})
                      </span>
                      <span className="text-brand-400 mx-2">&bull;</span>
                      <span className="text-brand-600 font-medium">
                        {sub.university?.name}
                      </span>
                      <span className="text-brand-400 mx-2">&bull;</span>
                      <span className="capitalize text-brand-500 font-mono">
                        {sub.dayType.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-brand-500">
                      <span className="font-mono">
                        P: <strong className="text-emerald-700">{sub.presentCount}</strong> | A:{' '}
                        <strong className="text-red-700">{sub.absentCount}</strong>
                      </span>
                      <span className="text-[11px]">
                        By {sub.submittedBy?.name || 'Coach'} on{' '}
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* University Detail Modal */}
      {detailUniId && (
        <UniversityDetailModal
          universityId={detailUniId}
          date={date}
          onClose={() => setDetailUniId(null)}
        />
      )}
    </div>
  );
}

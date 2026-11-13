import { useState, useEffect, useMemo } from 'react';
import reportService from '../../services/reportService';
import universityService from '../../services/universityService';
import sectionService from '../../services/sectionService';
import studentService from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Search,
  Users,
  CalendarDays,
  XCircle,
  Clock,
  CalendarOff,
  Briefcase,
  Percent,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  User,
  GraduationCap,
} from 'lucide-react';

const MONTHS = [
  { value: 1, name: 'January' },
  { value: 2, name: 'February' },
  { value: 3, name: 'March' },
  { value: 4, name: 'April' },
  { value: 5, name: 'May' },
  { value: 6, name: 'June' },
  { value: 7, name: 'July' },
  { value: 8, name: 'August' },
  { value: 9, name: 'September' },
  { value: 10, name: 'October' },
  { value: 11, name: 'November' },
  { value: 12, name: 'December' },
];

const REPORT_TYPES = [
  { id: 'monthly', name: 'Monthly Report', label: 'Monthly Attendance' },
  { id: 'section', name: 'Section-wise Report', label: 'Section-wise' },
  { id: 'university', name: 'University-wide Report', label: 'University-wide' },
  { id: 'student', name: 'Individual Student', label: 'Individual Student' },
  { id: 'semester', name: 'Semester Report', label: 'Semester Attendance' },
];

export default function ReportsPage() {
  const { isSuperAdmin, hasPermission, user } = useAuth();
  const canExport = isSuperAdmin || hasPermission('exportReports');

  // Report configuration
  const [reportType, setReportType] = useState('monthly');
  const now = new Date();

  // Filter lists
  const [universities, setUniversities] = useState([]);
  const [sections, setSections] = useState([]);
  const [studentsForDropdown, setStudentsForDropdown] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Filter selections
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [academicYear, setAcademicYear] = useState('2025-2026');

  const [startDate, setStartDate] = useState(() => {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Report preview data & UI states
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Table search, sorting & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('rollNumber');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedCards, setExpandedCards] = useState(new Set());

  // Load universities and sections
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingFilters(true);
        const [uRes, sRes] = await Promise.all([
          universityService.getUniversities({ status: 'active' }),
          sectionService.getSections({ status: 'active' }),
        ]);

        const uList = uRes.data || [];
        const sList = sRes.data || [];

        setUniversities(uList);
        setSections(sList);

        if (uList.length > 0) setSelectedUniversityId(uList[0]._id);
        if (sList.length > 0) setSelectedSectionId(sList[0]._id);
      } catch (err) {
        setError('Failed to load filter options');
      } finally {
        setLoadingFilters(false);
      }
    };
    loadInitialData();
  }, []);

  // Filter sections by selected university
  const filteredSections = useMemo(() => {
    if (!selectedUniversityId) return sections;
    return sections.filter((s) => {
      const uId = s.university?._id || s.university;
      return String(uId) === String(selectedUniversityId);
    });
  }, [sections, selectedUniversityId]);

  // If selectedSectionId is not in filteredSections, select the first available
  useEffect(() => {
    if (filteredSections.length > 0) {
      const exists = filteredSections.some((s) => s._id === selectedSectionId);
      if (!exists) {
        setSelectedSectionId(filteredSections[0]._id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [filteredSections, selectedSectionId]);

  // Load students for dropdown when individual student report is chosen
  useEffect(() => {
    if (reportType === 'student' && selectedSectionId) {
      studentService
        .getStudents({ section: selectedSectionId, status: 'active' })
        .then((res) => {
          const list = res.data || [];
          setStudentsForDropdown(list);
          if (list.length > 0) {
            setSelectedStudentId(list[0]._id);
          } else {
            setSelectedStudentId('');
          }
        })
        .catch(() => setStudentsForDropdown([]));
    }
  }, [reportType, selectedSectionId]);

  // Auto-generate report when initial filters are ready
  useEffect(() => {
    if (!loadingFilters && selectedUniversityId && (selectedSectionId || reportType === 'university')) {
      fetchReportPreview();
    }
  }, [loadingFilters]);

  // Fetch report preview
  const fetchReportPreview = async () => {
    try {
      setPreviewLoading(true);
      setError('');

      const params = {
        reportType,
        universityId: selectedUniversityId,
        sectionId: reportType === 'university' ? undefined : selectedSectionId,
        studentId: reportType === 'student' ? selectedStudentId : undefined,
        academicYear,
        month: selectedMonth,
        year: selectedYear,
        startDate: reportType === 'monthly' ? undefined : startDate,
        endDate: reportType === 'monthly' ? undefined : endDate,
      };

      const res = await reportService.getReportPreview(params);
      setPreviewData(res.data);
      setCurrentPage(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setAcademicYear('2025-2026');
    setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
    setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    if (universities.length > 0) setSelectedUniversityId(universities[0]._id);
    if (filteredSections.length > 0) setSelectedSectionId(filteredSections[0]._id);
    setSearchQuery('');
  };

  // Export Excel handler
  const handleExportExcel = async () => {
    if (!canExport) {
      setError('You do not have permission to export reports');
      return;
    }

    try {
      setDownloading(true);
      setError('');
      setSuccess('');

      if (reportType === 'monthly' || reportType === 'section') {
        if (!selectedSectionId) {
          setError('Please select a section');
          return;
        }
        await reportService.downloadMonthlyReport({
          sectionId: selectedSectionId,
          month: selectedMonth,
          year: selectedYear,
        });
        setSuccess('Monthly attendance workbook downloaded');
      } else if (reportType === 'university') {
        if (!selectedUniversityId) {
          setError('Please select a university');
          return;
        }
        await reportService.downloadUniversityReport({
          universityId: selectedUniversityId,
          month: selectedMonth,
          year: selectedYear,
        });
        setSuccess('University attendance workbook downloaded');
      } else if (reportType === 'semester') {
        if (!selectedUniversityId) {
          setError('Please select a university');
          return;
        }
        await reportService.downloadSemesterReport({
          universityId: selectedUniversityId,
          academicYear,
          startDate,
          endDate,
          sectionId: selectedSectionId || undefined,
        });
        setSuccess('Semester attendance workbook downloaded');
      } else if (reportType === 'student') {
        if (!selectedStudentId) {
          setError('Please select a student');
          return;
        }
        await reportService.downloadStudentReport({
          studentId: selectedStudentId,
          startDate,
          endDate,
          month: selectedMonth,
          year: selectedYear,
        });
        setSuccess('Student attendance workbook downloaded');
      }

      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    if (!previewData?.students) return [];

    let list = [...previewData.students];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.rollNumber?.toLowerCase().includes(q) ||
          s.niatId?.toLowerCase().includes(q) ||
          s.sectionName?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [previewData, searchQuery, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleCardExpand = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const summary = previewData?.summary || {
    totalStudents: 0,
    workingDays: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalLeave: 0,
    totalOnDuty: 0,
    averagePercentage: 0,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">
            Attendance Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generate, review and export university attendance reports.
          </p>
        </div>

        {canExport && (
          <button
            onClick={handleExportExcel}
            disabled={downloading || previewLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            <span>{downloading ? 'Generating Excel...' : 'Export to Excel'}</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Report Type Selector (Tabs) */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          {REPORT_TYPES.map((type) => {
            const isActive = reportType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setReportType(type.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-brand-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-brand-900 hover:bg-slate-100'
                }`}
              >
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Panel */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 border-b border-slate-100 pb-2.5">
          <Filter className="h-4 w-4 text-brand-700" />
          <span>Report Configuration & Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* University selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              University *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedUniversityId}
                onChange={(e) => setSelectedUniversityId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
              >
                {universities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section selector (except for university-wide) */}
          {reportType !== 'university' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Section {reportType === 'semester' ? '(Optional)' : '*'}
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                >
                  {reportType === 'semester' && <option value="">All Sections</option>}
                  {filteredSections.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Student selector (when individual student report) */}
          {reportType === 'student' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Student *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                >
                  {studentsForDropdown.length === 0 && (
                    <option value="">No students in section</option>
                  )}
                  {studentsForDropdown.map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.rollNumber} - {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Month & Year (when monthly, university, or student without date range) */}
          {(reportType === 'monthly' || reportType === 'university') && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Month *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Year *
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Academic Year (when semester) */}
          {reportType === 'semester' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Academic Year *
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Date Range (when section-wise, student, or semester) */}
          {(reportType === 'section' || reportType === 'student' || reportType === 'semester') && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={fetchReportPreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 active:scale-98 transition disabled:opacity-50"
          >
            {previewLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Live Report Summary Metrics (8 Cards — Multi-colored, balanced, avoid all-blue) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Students */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Students</span>
            <span className="rounded-md bg-slate-100 p-1.5 text-slate-600">
              <Users className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900">{summary.totalStudents}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Enrolled</div>
          </div>
        </div>

        {/* Working Days */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Working Days</span>
            <span className="rounded-md bg-slate-100 p-1.5 text-slate-600">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900">{summary.workingDays}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Academic sessions</div>
          </div>
        </div>

        {/* Present (Green / Emerald) */}
        <div className="rounded-xl border border-emerald-200/70 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-700">Present</span>
            <span className="rounded-md bg-emerald-100/70 p-1.5 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-emerald-700">{summary.totalPresent}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Attended</div>
          </div>
        </div>

        {/* Absent (Red / Rose) */}
        <div className="rounded-xl border border-rose-200/70 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-rose-700">Absent</span>
            <span className="rounded-md bg-rose-100/70 p-1.5 text-rose-600">
              <XCircle className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-700">{summary.totalAbsent}</div>
            <div className="text-[10px] text-rose-600 mt-0.5">Unexcused</div>
          </div>
        </div>

        {/* Late (Amber) */}
        <div className="rounded-xl border border-amber-200/70 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-700">Late</span>
            <span className="rounded-md bg-amber-100/70 p-1.5 text-amber-600">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-700">{summary.totalLate}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Counted in %</div>
          </div>
        </div>

        {/* Leave (Purple) */}
        <div className="rounded-xl border border-purple-200/70 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-purple-700">Leave</span>
            <span className="rounded-md bg-purple-100/70 p-1.5 text-purple-600">
              <CalendarOff className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-purple-700">{summary.totalLeave}</div>
            <div className="text-[10px] text-purple-600 mt-0.5">Authorized</div>
          </div>
        </div>

        {/* On Duty (Teal) */}
        <div className="rounded-xl border border-teal-200/70 bg-white p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-teal-700">On Duty</span>
            <span className="rounded-md bg-teal-100/70 p-1.5 text-teal-600">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-teal-700">{summary.totalOnDuty}</div>
            <div className="text-[10px] text-teal-600 mt-0.5">Duty representation</div>
          </div>
        </div>

        {/* Average Attendance % */}
        <div
          className={`rounded-xl border p-3.5 shadow-xs flex flex-col justify-between ${
            summary.averagePercentage >= 85
              ? 'border-emerald-300 bg-emerald-50/50'
              : summary.averagePercentage >= 75
              ? 'border-amber-300 bg-amber-50/50'
              : 'border-rose-300 bg-rose-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">Avg Attendance</span>
            <span
              className={`rounded-md p-1.5 ${
                summary.averagePercentage >= 85
                  ? 'bg-emerald-100 text-emerald-700'
                  : summary.averagePercentage >= 75
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              <Percent className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-bold ${
                summary.averagePercentage >= 85
                  ? 'text-emerald-700'
                  : summary.averagePercentage >= 75
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {summary.averagePercentage}%
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">Overall cohort</div>
          </div>
        </div>
      </div>

      {/* Report Results Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Results Header: Search & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Report Data Breakdown
            </h2>
            <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {filteredStudents.length} Students
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, roll, or NIAT..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-brand-600 focus:outline-none"
              />
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Desktop Data Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 select-none">
              <tr>
                <th
                  onClick={() => handleSort('rollNumber')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-brand-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Roll No</span>
                    {sortField === 'rollNumber' && (
                      <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 font-semibold cursor-pointer hover:text-brand-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Student Name</span>
                    {sortField === 'name' && (
                      <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">NIAT ID</th>
                <th className="py-3 px-4 font-semibold">Section</th>
                <th className="py-3 px-4 font-semibold text-center">Working</th>
                <th
                  onClick={() => handleSort('presentDays')}
                  className="py-3 px-4 font-semibold text-center text-emerald-700 cursor-pointer hover:text-emerald-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Present</span>
                    {sortField === 'presentDays' && (
                      <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('absentDays')}
                  className="py-3 px-4 font-semibold text-center text-rose-700 cursor-pointer hover:text-rose-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Absent</span>
                    {sortField === 'absentDays' && (
                      <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center text-amber-700">Late</th>
                <th className="py-3 px-4 font-semibold text-center text-purple-700">Leave</th>
                <th className="py-3 px-4 font-semibold text-center text-teal-700">OD</th>
                <th
                  onClick={() => handleSort('percentage')}
                  className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-brand-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Attendance %</span>
                    {sortField === 'percentage' && (
                      <span className="text-[10px]">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-700 mb-2" />
                    <span>Loading report breakdown...</span>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    No student attendance records match the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st) => (
                  <tr key={st._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{st.rollNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{st.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {st.studentPhone || st.parentPhone || 'No contact'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {st.niatId}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{st.sectionName}</td>
                    <td className="py-3 px-4 text-center text-slate-700 font-medium">
                      {st.workingDays}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                      {st.presentDays}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-rose-700">
                      {st.absentDays}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-amber-700">
                      {st.lateDays}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-purple-700">
                      {st.leaveDays}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-teal-700">
                      {st.onDutyDays}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          st.percentage >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : st.percentage >= 75
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {st.percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {previewLoading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-700 mb-2" />
              <span>Loading report breakdown...</span>
            </div>
          ) : paginatedStudents.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No student attendance records match the selected criteria.
            </div>
          ) : (
            paginatedStudents.map((st) => {
              const isExpanded = expandedCards.has(st._id);
              return (
                <div key={st._id} className="p-4 space-y-3 bg-white">
                  {/* Top line: Name & Attendance % */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{st.name}</div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{st.rollNumber}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">{st.niatId}</span>
                        <span>•</span>
                        <span>{st.sectionName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          st.percentage >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : st.percentage >= 75
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {st.percentage}%
                      </span>
                      <button
                        onClick={() => toggleCardExpand(st._id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Metrics Mini Grid (multi-colored) */}
                  <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-1.5">
                      <div className="text-[10px] text-emerald-700 font-medium">Present</div>
                      <div className="text-xs font-bold text-emerald-800">{st.presentDays}</div>
                    </div>
                    <div className="rounded-lg bg-rose-50 border border-rose-100 py-1.5">
                      <div className="text-[10px] text-rose-700 font-medium">Absent</div>
                      <div className="text-xs font-bold text-rose-800">{st.absentDays}</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 py-1.5">
                      <div className="text-[10px] text-amber-700 font-medium">Late</div>
                      <div className="text-xs font-bold text-amber-800">{st.lateDays}</div>
                    </div>
                    <div className="rounded-lg bg-purple-50 border border-purple-100 py-1.5">
                      <div className="text-[10px] text-purple-700 font-medium">Leave/OD</div>
                      <div className="text-xs font-bold text-purple-800">
                        {st.leaveDays + st.onDutyDays}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Information */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1.5 bg-slate-50/70 p-2.5 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Working Days:</span>
                        <span className="font-medium text-slate-800">{st.workingDays}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Authorized Leave:</span>
                        <span className="font-medium text-purple-700">{st.leaveDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Official On Duty:</span>
                        <span className="font-medium text-teal-700">{st.onDutyDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Parent / Contact:</span>
                        <span className="font-medium text-slate-800">
                          {st.parentName} ({st.parentPhone || '—'})
                        </span>
                      </div>
                      {st.studentPhone && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Student Phone:</span>
                          <span className="font-medium text-slate-800">{st.studentPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(currentPage * pageSize, totalItems)}
              </span>{' '}
              of <span className="font-semibold">{totalItems}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 font-medium text-slate-800">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
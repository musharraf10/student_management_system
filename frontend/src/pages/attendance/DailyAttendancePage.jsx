import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import attendanceService from '../../services/attendanceService';
import sectionService from '../../services/sectionService';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import MobileStudentCard from '../../components/attendance/MobileStudentCard';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  History,
  ShieldAlert,
  Loader2,
  Calendar,
  Layers,
  Building2,
  Check,
  Edit2,
  X,
  Search,
  MoreVertical,
  Briefcase,
  ExternalLink,
  RotateCcw,
  Phone,
  Filter,
  HelpCircle,
} from 'lucide-react';

/**
 * Desktop table row for a student with simplified Present / Absent buttons + Three-Dot Menu
 */
function DesktopAttendanceRow({
  student,
  status,
  remarks,
  canEdit,
  isSubmitted,
  onStatusChange,
  onRemarksChange,
  onOpenCorrection,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalPos, setPortalPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const handleToggleMenu = (e) => {
    e.stopPropagation();
    if (!menuOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const dropdownHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      const top = openUpward ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4;
      const left = Math.min(
        Math.max(8, rect.right - 210),
        window.innerWidth - 220
      );
      setPortalPos({ top, left });
    }
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !event.target.closest?.('[data-portal-menu]')
      ) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    function handleScrollOrResize() {
      setMenuOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [menuOpen]);

  const statusConfig = {
    present: { label: 'Present', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    absent: { label: 'Absent', badgeClass: 'bg-red-50 text-red-800 border-red-200' },
    late: { label: 'Late', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold' },
    leave: { label: 'Leave', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200' },
    on_duty: { label: 'On Duty', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200' },
    pending: { label: 'Pending', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  };

  const currentCfg = statusConfig[status] || statusConfig.pending;
  const attendancePct = student.attendancePercentage;

  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      {/* Roll Number & NIAT ID */}
      <td className="py-3 px-4">
        <div className="font-mono text-xs font-semibold text-slate-900">
          {student.rollNumber}
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          {student.niatId}
        </div>
      </td>

      {/* Student Name & Phone */}
      <td className="py-3 px-4">
        <Link
          to={`/students/${student._id}/attendance`}
          className="text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline block truncate max-w-[200px]"
          title="View Student Attendance Profile"
        >
          {student.name}
        </Link>
        {student.studentPhone && (
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="h-3 w-3" />
            <span>{student.studentPhone}</span>
          </div>
        )}
      </td>

      {/* Individual Attendance % */}
      <td className="py-3 px-4">
        <Link
          to={`/students/${student._id}/attendance`}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-xs text-slate-700 transition-colors"
          title="Click to view student individual attendance sheet"
        >
          <span className="text-slate-500 font-medium">Att:</span>
          <span
            className={`font-semibold ${
              (attendancePct ?? 100) >= 75
                ? 'text-emerald-700'
                : (attendancePct ?? 100) >= 65
                ? 'text-amber-700'
                : 'text-red-700'
            }`}
          >
            {attendancePct !== undefined ? `${attendancePct}%` : 'N/A'}
          </span>
        </Link>
      </td>

      {/* Current Attendance Status Badge */}
      <td className="py-3 px-4 text-center">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${currentCfg.badgeClass}`}
        >
          {status === 'pending' && <Clock className="h-3 w-3 text-slate-500" />}
          {status === 'present' && <Check className="h-3 w-3 text-emerald-600" />}
          {status === 'absent' && <X className="h-3 w-3 text-red-600" />}
          {status === 'late' && <Clock className="h-3 w-3 text-amber-600" />}
          {status === 'leave' && <Calendar className="h-3 w-3 text-purple-600" />}
          {status === 'on_duty' && <Briefcase className="h-3 w-3 text-teal-600" />}
          <span>{currentCfg.label}</span>
        </span>
      </td>

      {/* Actions: ONLY TWO PRIMARY BUTTONS [ Present ] [ Absent ] + Three-Dot Menu */}
      <td className="py-3 px-4">
        <div className="flex items-center justify-center gap-2">
          {/* Present */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onStatusChange(student._id, 'present')}
            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              status === 'present'
                ? 'bg-emerald-600 text-white font-semibold border border-emerald-600 shadow-xs'
                : 'border border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100'
            }`}
            title="Mark Present"
          >
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Present</span>
          </button>

          {/* Absent */}
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onStatusChange(student._id, 'absent')}
            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              status === 'absent'
                ? 'bg-red-600 text-white font-semibold border border-red-600 shadow-xs'
                : 'border border-red-300 text-red-800 bg-red-50/60 hover:bg-red-100'
            }`}
            title="Mark Absent"
          >
            <X className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Absent</span>
          </button>

          {/* Three-Dot Menu with Floating Portal Dropdown */}
          <div ref={menuRef}>
            <button
              type="button"
              onClick={handleToggleMenu}
              className="h-[38px] w-[38px] flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors shadow-xs"
              title="More Options"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  data-portal-menu="true"
                  style={{
                    position: 'fixed',
                    top: `${portalPos.top}px`,
                    left: `${portalPos.left}px`,
                    zIndex: 9999,
                  }}
                  className="w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl transition-all select-none animate-fade-in"
                  role="menu"
                >
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Additional Statuses
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(student._id, 'late');
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 text-left cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Mark Late</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(student._id, 'leave');
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-purple-800 hover:bg-purple-50 text-left cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span>Mark Leave</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(student._id, 'on_duty');
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-teal-800 hover:bg-teal-50 text-left cursor-pointer"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span>Mark On Duty</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(`/students/${student._id}/attendance`);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>View Student Attendance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate(`/students/${student._id}/attendance`);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>View Attendance History</span>
                  </button>

                  {!isSubmitted && status !== 'pending' && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          onStatusChange(student._id, 'pending');
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 text-left cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Reset to Pending</span>
                      </button>
                    </>
                  )}

                  {isSubmitted && onOpenCorrection && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenCorrection(student._id);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50 text-left cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                        <span>Audit Correction</span>
                      </button>
                    </>
                  )}
                </div>,
                document.body
              )}
          </div>
        </div>
      </td>

      {/* Remarks */}
      <td className="py-3 px-4">
        <input
          type="text"
          disabled={!canEdit}
          value={remarks || ''}
          onChange={(e) => onRemarksChange(student._id, e.target.value)}
          placeholder="Optional note..."
          className="w-full rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none disabled:bg-slate-50"
        />
      </td>

      {/* Audit Edit button for submitted attendance */}
      {isSubmitted && canEdit && (
        <td className="py-3 px-4 text-right">
          <button
            type="button"
            onClick={() => onOpenCorrection(student._id)}
            className="inline-flex items-center gap-1 rounded p-1 text-brand-700 hover:bg-slate-100 text-xs font-medium"
            title="Audit Correction"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Audit</span>
          </button>
        </td>
      )}
    </tr>
  );
}

export default function DailyAttendancePage() {
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const canEdit = isSuperAdmin || hasPermission('editAttendance');

  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'audit'

  // Sections list for selection
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Sheet State
  const [dayType, setDayType] = useState('working_day');
  const [holidayReason, setHolidayReason] = useState('');
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'late' | 'absent' | 'leave' | 'on_duty' | 'pending'
  const [recordsMap, setRecordsMap] = useState({}); // { studentId: { status, remarks, recordId } }
  const [existingAttendanceDay, setExistingAttendanceDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Gesture tip state (dismissed once swiped or closed, persisted in localStorage)
  const [showSwipeTip, setShowSwipeTip] = useState(() => {
    try {
      return localStorage.getItem('attendance_swipe_tip_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissSwipeTip = () => {
    setShowSwipeTip(false);
    try {
      localStorage.setItem('attendance_swipe_tip_dismissed', 'true');
    } catch {}
  };

  // Correction Modal State (for modifying individual student record with audit reason)
  const [correctionModal, setCorrectionModal] = useState({
    isOpen: false,
    recordId: null,
    studentName: '',
    currentStatus: '',
    newStatus: 'present',
    reason: '',
    remarks: '',
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Fetch available sections
  useEffect(() => {
    const loadSections = async () => {
      try {
        const res = await sectionService.getSections({ status: 'active' });
        const list = res.data || [];
        setSections(list);
        if (list.length > 0 && !selectedSectionId) {
          setSelectedSectionId(list[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load sections');
      }
    };
    loadSections();
  }, []);

  // 2. Fetch daily sheet when section or date changes
  const fetchDailySheet = async () => {
    if (!selectedSectionId || !selectedDate) return;

    try {
      setLoading(true);
      setError('');
      const res = await attendanceService.getDailySheet(selectedSectionId, selectedDate);
      const data = res.data;

      if (data.isSubmitted && data.attendanceDay) {
        setExistingAttendanceDay(data.attendanceDay);
        setDayType(data.attendanceDay.dayType);
        setHolidayReason(data.attendanceDay.holidayReason || '');

        // Map existing student records
        const newMap = {};
        (data.records || []).forEach((r) => {
          if (r.student) {
            newMap[r.student._id || r.student] = {
              status: r.status,
              remarks: r.remarks || '',
              recordId: r._id,
              student: r.student,
            };
          }
        });
        setRecordsMap(newMap);
        setStudents((data.records || []).map((r) => r.student));
      } else {
        // Not submitted yet
        setExistingAttendanceDay(null);
        setDayType('working_day');
        setHolidayReason('');

        const studentList = data.students || [];
        setStudents(studentList);

        // Initialize students as 'pending' so unrecorded students are clearly distinguishable
        const initialMap = {};
        studentList.forEach((s) => {
          initialMap[s._id] = {
            status: 'pending',
            remarks: '',
            recordId: null,
            student: s,
          };
        });
        setRecordsMap(initialMap);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSectionId && selectedDate) {
      fetchDailySheet();
    }
  }, [selectedSectionId, selectedDate]);

  // 3. Mark All with specific status
  const handleMarkAll = (status) => {
    const updated = { ...recordsMap };
    Object.keys(updated).forEach((sId) => {
      updated[sId] = { ...updated[sId], status };
    });
    setRecordsMap(updated);
  };

  // 4. Update individual status in local map & persist if already submitted
  const handleStatusChange = async (studentId, status) => {
    // Immediate UI update so lists, live counts, and badges update instantly
    setRecordsMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));

    // If this sheet was already submitted and has an existing recordId, persist immediately with audit tracking
    const currentItem = recordsMap[studentId];
    if (existingAttendanceDay && currentItem?.recordId && canEdit) {
      try {
        await attendanceService.updateStudentRecord(currentItem.recordId, {
          newStatus: status,
          reason: `Status updated to ${status.replace('_', ' ')} via attendance options menu`,
        });
      } catch (err) {
        console.error('Failed to update student attendance record:', err);
        setError(err.response?.data?.message || 'Failed to update student attendance record');
      }
    }
  };

  // 5. Update remarks
  const handleRemarksChange = (studentId, remarks) => {
    setRecordsMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  // 6. Compute live counters & client-side filtered students
  const counts = {
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    on_duty: 0,
    pending: 0,
  };
  Object.values(recordsMap).forEach((r) => {
    if (counts[r.status] !== undefined) {
      counts[r.status]++;
    }
  });

  // Client-side search and status filtering within the selected section
  const filteredStudents = students.filter((s) => {
    if (studentSearch.trim()) {
      const term = studentSearch.toLowerCase().trim();
      const matchSearch =
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(term)) ||
        (s.niatId && s.niatId.toLowerCase().includes(term));
      if (!matchSearch) return false;
    }
    if (statusFilter !== 'all') {
      const currentStatus = recordsMap[s._id]?.status || 'pending';
      if (currentStatus !== statusFilter) return false;
    }
    return true;
  });

  // Segregate students into Pending Attendance and Completed Attendance
  const pendingStudents = filteredStudents.filter(
    (s) => (recordsMap[s._id]?.status || 'pending') === 'pending'
  );
  const completedStudents = filteredStudents.filter(
    (s) => recordsMap[s._id]?.status && recordsMap[s._id].status !== 'pending'
  );

  // 7. Submit attendance
  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (dayType === 'working_day' || dayType === 'online_class') {
      if (counts.pending > 0) {
        setError(`There are ${counts.pending} student(s) with pending attendance. Please mark all students before submitting, or click "Mark All Present".`);
        setSaving(false);
        return;
      }
    }

    const recordsPayload = Object.entries(recordsMap).map(([studentId, item]) => ({
      studentId,
      status: item.status,
      remarks: item.remarks,
    }));

    try {
      await attendanceService.submitDailyAttendance({
        sectionId: selectedSectionId,
        date: selectedDate,
        dayType,
        holidayReason,
        records: recordsPayload,
      });

      setSuccess('Attendance submitted successfully');
      fetchDailySheet();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit attendance');
    } finally {
      setSaving(false);
    }
  };

  // 8. Open correction modal
  const openCorrection = (studentId) => {
    const item = recordsMap[studentId];
    if (!item || !item.recordId) return;

    setCorrectionModal({
      isOpen: true,
      recordId: item.recordId,
      studentName: item.student?.name || 'Student',
      currentStatus: item.status,
      newStatus: item.status,
      reason: '',
      remarks: item.remarks || '',
    });
  };

  // 9. Save single student correction with audit trail
  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    try {
      await attendanceService.updateStudentRecord(correctionModal.recordId, {
        newStatus: correctionModal.newStatus,
        reason: correctionModal.reason,
        remarks: correctionModal.remarks,
      });
      setCorrectionModal({ ...correctionModal, isOpen: false });
      setSuccess('Attendance record updated with permanent audit log');
      fetchDailySheet();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Correction failed');
    }
  };

  // 10. Load audit history tab
  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await attendanceService.getAuditLogs({
        sectionId: selectedSectionId || undefined,
        limit: 100,
      });
      setAuditLogs(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, selectedSectionId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSuperAdmin
              ? 'Multi-university attendance verification, day types, and audit trail'
              : 'Mark and review daily classroom attendance for assigned sections'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'sheet'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-brand-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Audit History</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span className="font-medium">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* Selector Card (Section & Date) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Section *
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="block w-full min-h-[42px] rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 focus:border-brand-700 focus:outline-none shadow-xs"
            >
              {sections.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code}) - {s.university?.code || 'Uni'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attendance Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full min-h-[42px] rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 focus:border-brand-700 focus:outline-none shadow-xs"
              />
            </div>
          </div>

          {activeTab === 'sheet' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Day Type *
              </label>
              <select
                disabled={existingAttendanceDay && !canEdit}
                value={dayType}
                onChange={(e) => setDayType(e.target.value)}
                className="block w-full min-h-[42px] rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 focus:border-brand-700 focus:outline-none disabled:bg-slate-100 shadow-xs"
              >
                <option value="working_day">Working Day</option>
                <option value="online_class">Online Class</option>
                <option value="sunday">Sunday</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          )}

          {activeTab === 'sheet' && dayType === 'holiday' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Holiday Reason
              </label>
              <input
                type="text"
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                placeholder="e.g., Gandhi Jayanti"
                className="block w-full min-h-[42px] rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 focus:border-brand-700 focus:outline-none shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Existing Submission Indicator */}
        {existingAttendanceDay && (
          <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              Submitted
            </span>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === 'sheet' ? (
        <>
          {/* Day Type Details Banner for Sunday / Holiday */}
          {(dayType === 'sunday' || dayType === 'holiday') && (
            <div className="rounded-xl border border-brand-200 bg-white p-8 text-center shadow-xs">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 mb-3">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-brand-900 capitalize">
                {dayType.replace('_', ' ')}
              </h3>
              <p className="mt-1 text-xs text-brand-500 max-w-md mx-auto">
                {dayType === 'sunday'
                  ? 'Sundays are institutional non-working days. Individual student attendance is not required.'
                  : `Marked as a holiday${holidayReason ? `: ${holidayReason}` : ''}. This date will be excluded from student working day totals.`}
              </p>

              <div className="mt-5">
                <button
                  onClick={handleSubmitAttendance}
                  disabled={saving || (existingAttendanceDay && !canEdit)}
                  className="rounded-lg bg-brand-700 px-5 py-2.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : existingAttendanceDay
                    ? 'Update Day Status'
                    : `Confirm as ${dayType.toUpperCase()}`}
                </button>
              </div>
            </div>
          )}

          {/* Working Day / Online Class Content */}
          {(dayType === 'working_day' || dayType === 'online_class') && (
            <div className="space-y-6">
              {/* B. ATTENDANCE SUMMARY METRICS */}
              {/* Mobile Compact Single-Line Summary (sm:hidden) */}
              <div className="sm:hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs">
                  <div className="font-semibold text-slate-800">
                    Total: <strong className="text-slate-900">{students.length}</strong>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-slate-600">
                    <span className="text-emerald-700 font-semibold">Present: {counts.present}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-red-700 font-semibold">Absent: {counts.absent}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-amber-700 font-semibold">Late: {counts.late}</span>
                    {counts.leave > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-purple-700 font-semibold">Leave: {counts.leave}</span>
                      </>
                    )}
                    {counts.on_duty > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-teal-700 font-semibold">OD: {counts.on_duty}</span>
                      </>
                    )}
                    {counts.pending > 0 && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                          Pending: {counts.pending}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop 7-Card Grid (hidden sm:grid) */}
              <div className="hidden sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {/* Total Students */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <p className="text-xs font-medium text-slate-500">Total Students</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{students.length}</p>
                </div>

                {/* Present */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
                  <p className="text-xs font-semibold text-emerald-800">Present</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">{counts.present}</p>
                </div>

                {/* Absent */}
                <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-xs">
                  <p className="text-xs font-semibold text-red-800">Absent</p>
                  <p className="mt-1 text-2xl font-bold text-red-700">{counts.absent}</p>
                </div>

                {/* Late */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
                  <p className="text-xs font-semibold text-amber-800">Late</p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">{counts.late}</p>
                </div>

                {/* Leave */}
                <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-xs">
                  <p className="text-xs font-semibold text-purple-800">Leave</p>
                  <p className="mt-1 text-2xl font-bold text-purple-700">{counts.leave}</p>
                </div>

                {/* On Duty */}
                <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 shadow-xs">
                  <p className="text-xs font-semibold text-teal-800">On Duty (OD)</p>
                  <p className="mt-1 text-2xl font-bold text-teal-700">{counts.on_duty}</p>
                </div>

                {/* Pending */}
                <div
                  className={`rounded-2xl border p-4 shadow-xs col-span-2 sm:col-span-1 ${
                    counts.pending > 0
                      ? 'border-amber-300 bg-amber-50/80'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <p
                    className={`text-xs font-semibold ${
                      counts.pending > 0 ? 'text-amber-900' : 'text-slate-500'
                    }`}
                  >
                    Pending
                  </p>
                  <p
                    className={`mt-1 text-2xl font-bold ${
                      counts.pending > 0 ? 'text-amber-800' : 'text-slate-700'
                    }`}
                  >
                    {counts.pending}
                  </p>
                </div>
              </div>

              {/* C. SEARCH AND FILTERS TOOLBAR */}
              <div className="flex flex-col gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                {/* Search Bar & Quick Mark Row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-md flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search student by name, roll number, or NIAT ID..."
                        className="block w-full min-h-[42px] rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:outline-none shadow-xs"
                      />
                      {studentSearch && (
                        <button
                          type="button"
                          onClick={() => setStudentSearch('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Help icon to view swipe instructions again */}
                    <button
                      type="button"
                      onClick={() => setShowSwipeTip((prev) => !prev)}
                      className={`min-h-[42px] min-w-[42px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer shadow-xs ${
                        showSwipeTip
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                      title="Toggle swipe gesture help"
                      aria-label="Toggle swipe gesture help"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Quick actions */}
                  {(!existingAttendanceDay || canEdit) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMarkAll('present')}
                        className="min-h-[42px] rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition-colors shadow-xs"
                      >
                        Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkAll('absent')}
                        className="min-h-[42px] rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 cursor-pointer transition-colors shadow-xs"
                      >
                        Mark All Absent
                      </button>
                    </div>
                  )}
                </div>

                {/* Segmented Status Filter Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* All */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-brand-900 text-white shadow-xs font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>All</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] font-semibold ${
                          statusFilter === 'all'
                            ? 'bg-brand-700 text-white'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {students.length}
                      </span>
                    </button>

                    {/* Present */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('present')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        statusFilter === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[2.5]" />
                      <span>Present</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                          statusFilter === 'present'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-200/80 text-emerald-900'
                        }`}
                      >
                        {counts.present}
                      </span>
                    </button>

                    {/* Late */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('late')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        statusFilter === 'late'
                          ? 'bg-amber-600 text-white shadow-xs font-semibold'
                          : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>Late</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                          statusFilter === 'late'
                            ? 'bg-amber-700 text-white'
                            : 'bg-amber-200/80 text-amber-900'
                        }`}
                      >
                        {counts.late}
                      </span>
                    </button>

                    {/* Absent */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('absent')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        statusFilter === 'absent'
                          ? 'bg-red-600 text-white shadow-xs font-semibold'
                          : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                      }`}
                    >
                      <X className="h-3 w-3 stroke-[2.5]" />
                      <span>Absent</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                          statusFilter === 'absent'
                            ? 'bg-red-700 text-white'
                            : 'bg-red-200/80 text-red-900'
                        }`}
                      >
                        {counts.absent}
                      </span>
                    </button>

                    {/* Leave */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('leave')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        statusFilter === 'leave'
                          ? 'bg-purple-600 text-white shadow-xs font-semibold'
                          : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      <span>Leave</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                          statusFilter === 'leave'
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-200/80 text-purple-900'
                        }`}
                      >
                        {counts.leave}
                      </span>
                    </button>

                    {/* On Duty */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('on_duty')}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                        statusFilter === 'on_duty'
                          ? 'bg-teal-700 text-white shadow-xs font-semibold'
                          : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      <span>OD</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                          statusFilter === 'on_duty'
                            ? 'bg-teal-800 text-white'
                            : 'bg-teal-200/80 text-teal-900'
                        }`}
                      >
                        {counts.on_duty}
                      </span>
                    </button>

                    {/* Pending (if any) */}
                    {counts.pending > 0 && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter('pending')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          statusFilter === 'pending'
                            ? 'bg-slate-700 text-white shadow-xs font-semibold'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <span>Pending</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${
                            statusFilter === 'pending'
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {counts.pending}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Search / Filter Reset Indicator */}
                  {(studentSearch || statusFilter !== 'all') && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 font-medium">
                        Showing {filteredStudents.length} of {students.length} students
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentSearch('');
                          setStatusFilter('all');
                        }}
                        className="text-[11px] font-medium text-brand-700 hover:text-brand-900 underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* GESTURE INSTRUCTION BANNER (Dismissed on first swipe or close, re-openable via help button) */}
              {showSwipeTip && (!existingAttendanceDay || canEdit) && students.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-950 flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-sm animate-pulse shrink-0">
                      👉
                    </span>
                    <div>
                      <span className="font-semibold text-sm">Swipe right for Present, left for Absent.</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Tip dismisses automatically after your first swipe. You can also tap buttons or the Options menu.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissSwipeTip}
                    className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-200/60 hover:text-amber-950 cursor-pointer transition-colors"
                    title="Dismiss tip"
                    aria-label="Dismiss tip"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Mobile Student Cards (block md:hidden) */}
              <div className="block md:hidden space-y-4">
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-700" />
                    <span className="mt-2 block text-xs">Loading sheet...</span>
                  </div>
                ) : students.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
                    <span className="mt-2 block text-xs">No active students found in this section</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                    <Search className="mx-auto h-6 w-6 text-slate-300 mb-1" />
                    <span className="block text-xs font-medium text-slate-700">
                      No students match the current filters
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentSearch('');
                        setStatusFilter('all');
                      }}
                      className="mt-2 text-xs text-brand-700 hover:text-brand-900 underline cursor-pointer"
                    >
                      Reset search and filters
                    </button>
                  </div>
                ) : statusFilter === 'all' ? (
                  <div className="space-y-6">
                    {/* SECTION D: Pending Students */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                            Pending Attendance
                          </h3>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {pendingStudents.length}
                          </span>
                        </div>
                        {pendingStudents.length > 0 && (!existingAttendanceDay || canEdit) && (
                          <span className="text-xs text-brand-700 font-medium">
                            Swipe or tap to mark
                          </span>
                        )}
                      </div>

                      {pendingStudents.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                          <p className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5">
                            <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
                            All students marked! Ready to review and submit.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 transition-all duration-300">
                          {pendingStudents.map((student) => {
                            const currentItem = recordsMap[student._id] || { status: 'pending', remarks: '' };
                            return (
                              <MobileStudentCard
                                key={student._id}
                                student={student}
                                status={currentItem.status}
                                remarks={currentItem.remarks}
                                canEdit={!existingAttendanceDay || canEdit}
                                isSubmitted={Boolean(existingAttendanceDay)}
                                isPendingGroup={true}
                                onStatusChange={handleStatusChange}
                                onRemarksChange={handleRemarksChange}
                                onOpenCorrection={openCorrection}
                                onSwipeSuccess={handleDismissSwipeTip}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* SECTION E: Completed Attendance */}
                    {completedStudents.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                              Completed Attendance
                            </h3>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                              {completedStudents.length}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-normal">
                            Tap buttons to adjust status
                          </span>
                        </div>

                        <div className="space-y-3 transition-all duration-300">
                          {completedStudents.map((student) => {
                            const currentItem = recordsMap[student._id] || { status: 'present', remarks: '' };
                            return (
                              <MobileStudentCard
                                key={student._id}
                                student={student}
                                status={currentItem.status}
                                remarks={currentItem.remarks}
                                canEdit={!existingAttendanceDay || canEdit}
                                isSubmitted={Boolean(existingAttendanceDay)}
                                isPendingGroup={false}
                                onStatusChange={handleStatusChange}
                                onRemarksChange={handleRemarksChange}
                                onOpenCorrection={openCorrection}
                                onSwipeSuccess={handleDismissSwipeTip}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Specific Status Filter is Active */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-brand-700"></span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                          {statusFilter === 'pending'
                            ? 'Pending Students'
                            : `${statusFilter.replace('_', ' ')} Students`}
                        </h3>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
                          {filteredStudents.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="text-xs text-brand-700 font-medium hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-3">
                      {filteredStudents.map((student) => {
                        const currentItem = recordsMap[student._id] || { status: 'pending', remarks: '' };
                        return (
                          <MobileStudentCard
                            key={student._id}
                            student={student}
                            status={currentItem.status}
                            remarks={currentItem.remarks}
                            canEdit={!existingAttendanceDay || canEdit}
                            isSubmitted={Boolean(existingAttendanceDay)}
                            isPendingGroup={currentItem.status === 'pending'}
                            onStatusChange={handleStatusChange}
                            onRemarksChange={handleRemarksChange}
                            onOpenCorrection={openCorrection}
                            onSwipeSuccess={handleDismissSwipeTip}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Student Attendance Sheet Table (hidden md:block) */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs min-h-[300px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Roll / NIAT ID</th>
                        <th className="py-3 px-4">Student & Contact</th>
                        <th className="py-3 px-4">Att. Rate</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Attendance Marking</th>
                        <th className="py-3 px-4">Remarks</th>
                        {existingAttendanceDay && canEdit && (
                          <th className="py-3 px-4 text-right">Correction</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-700" />
                            <span className="mt-2 block text-xs">Loading sheet...</span>
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
                            <span className="mt-2 block text-xs">
                              No active students found in this section
                            </span>
                          </td>
                        </tr>
                      ) : filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            <Search className="mx-auto h-6 w-6 text-slate-300 mb-1" />
                            <span className="block text-xs font-medium text-slate-700">
                              No students match the current filters
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setStudentSearch('');
                                setStatusFilter('all');
                              }}
                              className="mt-2 text-xs text-brand-700 hover:text-brand-900 underline cursor-pointer"
                            >
                              Reset search and filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => {
                          const currentItem = recordsMap[student._id] || { status: 'pending', remarks: '' };
                          return (
                            <DesktopAttendanceRow
                              key={student._id}
                              student={student}
                              status={currentItem.status}
                              remarks={currentItem.remarks}
                              canEdit={!existingAttendanceDay || canEdit}
                              isSubmitted={Boolean(existingAttendanceDay)}
                              onStatusChange={handleStatusChange}
                              onRemarksChange={handleRemarksChange}
                              onOpenCorrection={openCorrection}
                            />
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* F. SUBMISSION SECTION */}
              {students.length > 0 && (!existingAttendanceDay || canEdit) && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Attendance Summary</h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Total records: <strong className="text-slate-900">{students.length}</strong> (P: {counts.present}, A: {counts.absent}, LT: {counts.late}{counts.pending > 0 ? `, Pending: ${counts.pending}` : ''})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitAttendance}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-brand-800 disabled:opacity-60 cursor-pointer min-h-[46px]"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>
                      {existingAttendanceDay ? 'Resubmit Attendance' : 'Submit Attendance'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Audit History View */
        <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
          <div className="border-b border-brand-200 bg-brand-50 p-4">
            <h3 className="text-sm font-semibold text-brand-900">
              Attendance Audit Trail
            </h3>
            <p className="mt-0.5 text-xs text-brand-500">
              Chronological log of all attendance submissions, corrections, and modifications
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-brand-200 bg-brand-50/60 text-brand-700 font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Attendance Date</th>
                  <th className="py-3 px-4">Status Transition</th>
                  <th className="py-3 px-4">Reason / Remarks</th>
                  <th className="py-3 px-4">Modified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 text-brand-800">
                {auditLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-brand-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                      <span className="mt-2 block text-xs">Loading audit trail...</span>
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-brand-500">
                      <History className="mx-auto h-8 w-8 text-brand-300" />
                      <span className="mt-2 block text-xs">No audit logs recorded yet</span>
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-brand-50/60 transition-colors">
                      <td className="py-3 px-4 text-brand-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-brand-100 px-2 py-0.5 font-mono text-[10px] font-medium text-brand-800 uppercase">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-brand-900">
                        {log.student ? (
                          <>
                            <span>{log.student.name}</span>
                            <span className="block font-mono text-[10px] text-brand-400">
                              {log.student.rollNumber}
                            </span>
                          </>
                        ) : (
                          <span className="text-brand-400 italic">Entire Section</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-brand-700 whitespace-nowrap">
                        {new Date(log.attendanceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs">
                          {log.previousStatus !== 'none' && (
                            <>
                              <span className="text-red-600 capitalize">
                                {log.previousStatus}
                              </span>
                              <span className="mx-1 text-brand-400">&rarr;</span>
                            </>
                          )}
                          <span className="text-emerald-700 capitalize font-semibold">
                            {log.newStatus}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-brand-600">
                        {log.reason || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-brand-900">
                          {log.updatedBy?.name}
                        </span>
                        <span className="block text-[10px] text-brand-400">
                          {log.updatedBy?.role === 'super_admin' ? 'Zonal Manager' : 'Coach'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Individual Record Correction Modal */}
      {correctionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-brand-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <h2 className="text-base font-semibold text-brand-900 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-brand-700" />
                <span>Attendance Correction</span>
              </h2>
              <button
                onClick={() =>
                  setCorrectionModal({ ...correctionModal, isOpen: false })
                }
                className="rounded p-1 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-brand-500">Student:</p>
                <p className="text-sm font-semibold text-brand-900">
                  {correctionModal.studentName}
                </p>
                <p className="text-xs text-brand-500 mt-1">
                  Current Status:{' '}
                  <span className="font-semibold uppercase text-brand-800">
                    {correctionModal.currentStatus}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  New Status *
                </label>
                <select
                  value={correctionModal.newStatus}
                  onChange={(e) =>
                    setCorrectionModal({
                      ...correctionModal,
                      newStatus: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                  <option value="on_duty">On Duty</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  Reason for Correction *
                </label>
                <input
                  type="text"
                  required
                  value={correctionModal.reason}
                  onChange={(e) =>
                    setCorrectionModal({
                      ...correctionModal,
                      reason: e.target.value,
                    })
                  }
                  placeholder="e.g., Medical certificate submitted / Late arrival"
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-100">
                <button
                  type="button"
                  onClick={() =>
                    setCorrectionModal({ ...correctionModal, isOpen: false })
                  }
                  className="rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800"
                >
                  Save & Log Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

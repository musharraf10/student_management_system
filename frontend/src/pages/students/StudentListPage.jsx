import { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import studentService from '../../services/studentService';
import universityService from '../../services/universityService';
import sectionService from '../../services/sectionService';
import attendanceDB from '../../services/attendanceDB';
import { useAuth } from '../../context/AuthContext';
import StudentImportModal from '../../components/students/StudentImportModal';
import {
  GraduationCap,
  Plus,
  Upload,
  Download,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  ArrowRightLeft,
  FileSpreadsheet,
  CalendarCheck,
  MoreVertical,
  Trash2,
  RotateCcw,
  AlertTriangle,
  User,
  Building2,
  Layers,
  History,
  ShieldAlert,
} from 'lucide-react';

/**
 * Three-dot dropdown action menu for individual student rows
 */
const StudentRowActionMenu = memo(function StudentRowActionMenu({
  student,
  canEdit,
  canDelete,
  isSuperAdmin,
  onOpenTransfer,
  onOpenDeactivate,
  onOpenRestore,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 200;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      const top = openUpward ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4;
      const left = Math.min(Math.max(8, rect.right - 200), window.innerWidth - 210);
      setCoords({ top, left });
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
        title="Student Actions"
        aria-label="Student actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-fade-in text-xs font-medium text-slate-700"
          >
            <Link
              to={`/students/${student._id}/attendance`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-brand-50 hover:text-brand-900 transition"
            >
              <CalendarCheck className="h-4 w-4 text-brand-600 shrink-0" />
              <span>View Attendance</span>
            </Link>

            {canEdit && (
              <Link
                to={`/students/${student._id}/edit`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-brand-50 hover:text-brand-900 transition"
              >
                <Edit2 className="h-4 w-4 text-brand-600 shrink-0" />
                <span>Edit Student</span>
              </Link>
            )}

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenTransfer(student);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-brand-50 hover:text-brand-900 transition cursor-pointer"
              >
                <ArrowRightLeft className="h-4 w-4 text-brand-600 shrink-0" />
                <span>Transfer Section</span>
              </button>
            )}

            <div className="my-1 border-t border-slate-100" />

            {student.status === 'active' ? (
              canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenDeactivate(student);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-red-600 hover:bg-red-50 transition cursor-pointer font-semibold"
                >
                  <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Delete / Deactivate</span>
                </button>
              )
            ) : (
              canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenRestore(student);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-emerald-700 hover:bg-emerald-50 transition cursor-pointer font-semibold"
                >
                  <RotateCcw className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Restore Student</span>
                </button>
              )
            )}
          </div>,
          document.body
        )}
    </div>
  );
});

export default function StudentListPage() {
  const { isSuperAdmin, hasPermission, user } = useAuth();
  const canAdd = isSuperAdmin || hasPermission('addStudents');
  const canEdit = isSuperAdmin || hasPermission('editStudents');
  const canDelete = isSuperAdmin || hasPermission('deleteStudents');
  const canExport = isSuperAdmin || hasPermission('exportReports');

  const [students, setStudents] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    rollNumber: '',
    niatId: '',
    name: '',
    parentName: '',
    parentPhone: '',
    studentPhone: '',
    university: '',
    section: '',
    academicYear: '2025-2026',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  // Transfer Modal State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferringStudent, setTransferringStudent] = useState(null);
  const [targetSectionId, setTargetSectionId] = useState('');

  // Excel Import & Export States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Deactivate Modal state
  const [deactivatingStudent, setDeactivatingStudent] = useState(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const [hasPendingOfflineRecords, setHasPendingOfflineRecords] = useState(false);

  // Restore Modal state
  const [restoringStudent, setRestoringStudent] = useState(null);
  const [restoring, setRestoring] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (universityFilter) params.university = universityFilter;
      if (sectionFilter) params.section = sectionFilter;
      if (statusFilter) params.status = statusFilter;

      const [studentRes, uniRes, secRes] = await Promise.all([
        studentService.getStudents(params),
        universityService.getUniversities(),
        sectionService.getSections({ university: universityFilter || undefined }),
      ]);

      setStudents(studentRes.data || []);
      setUniversities(uniRes.data || []);
      setSections(secRes.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [universityFilter, sectionFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const openDeactivateModal = async (student) => {
    setDeactivatingStudent(student);
    setDeactivateReason('');
    setHasPendingOfflineRecords(false);

    if (user?._id) {
      try {
        const pending = await attendanceDB.getAllPendingRecords(user._id);
        const hasPending = pending.some((r) => r.studentId === student._id);
        setHasPendingOfflineRecords(hasPending);
      } catch (err) {
        console.warn('Failed to inspect local records:', err);
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingStudent) return;
    try {
      setDeactivating(true);
      await studentService.deactivateStudent(deactivatingStudent._id, deactivateReason);
      setSuccess(`Student "${deactivatingStudent.name}" deactivated successfully`);
      setDeactivatingStudent(null);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate student');
    } finally {
      setDeactivating(false);
    }
  };

  const openRestoreModal = (student) => {
    setRestoringStudent(student);
  };

  const handleConfirmRestore = async () => {
    if (!restoringStudent) return;
    try {
      setRestoring(true);
      await studentService.restoreStudent(restoringStudent._id);
      setSuccess(`Student "${restoringStudent.name}" restored to active status successfully`);
      setRestoringStudent(null);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore student');
    } finally {
      setRestoring(false);
    }
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      rollNumber: '',
      niatId: '',
      name: '',
      parentName: '',
      parentPhone: '',
      studentPhone: '',
      university: universityFilter || universities[0]?._id || '',
      section: sectionFilter || sections[0]?._id || '',
      academicYear: '2025-2026',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      rollNumber: student.rollNumber,
      niatId: student.niatId,
      name: student.name,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      studentPhone: student.studentPhone || '',
      university: student.university?._id || student.university || '',
      section: student.section?._id || student.section || '',
      academicYear: student.academicYear,
      status: student.status,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingStudent) {
        await studentService.updateStudent(editingStudent._id, formData);
        setSuccess('Student updated successfully');
      } else {
        await studentService.createStudent(formData);
        setSuccess('Student registered successfully');
      }
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save student');
    } finally {
      setSubmitting(false);
    }
  };

  const openTransferModal = (student) => {
    setTransferringStudent(student);
    setTargetSectionId('');
    setIsTransferOpen(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!targetSectionId) return;

    try {
      await studentService.transferStudent(transferringStudent._id, targetSectionId);
      setIsTransferOpen(false);
      fetchData();
      setSuccess(`Student transferred to new section successfully`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed');
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = {};
      if (universityFilter) params.university = universityFilter;
      if (sectionFilter) params.section = sectionFilter;
      if (statusFilter) params.status = statusFilter;

      await studentService.exportStudentsExcel(params);
      setSuccess('Excel export generated successfully');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toggleStatus = async (student) => {
    try {
      const newStatus = student.status === 'active' ? 'inactive' : 'active';
      await studentService.updateStudent(student._id, { status: newStatus });
      fetchData();
      setSuccess(`Student status set to ${newStatus}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update student status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">Student Directory</h1>
          <p className="mt-0.5 text-xs text-brand-500">
            Manage student registrations, section mappings, and roster records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs active:scale-98 transition disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              ) : (
                <Download className="h-3.5 w-3.5 text-emerald-600" />
              )}
              <span>{exporting ? 'Exporting...' : 'Export Excel'}</span>
            </button>
          )}

          {canAdd && (
            <>
              <button
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs active:scale-98 transition"
              >
                <Upload className="h-3.5 w-3.5 text-brand-700" />
                <span>Import Excel</span>
              </button>

              <Link
                to="/students/create"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 active:scale-98 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Student</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, roll no, NIAT ID..."
            className="block w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white py-1.5 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
          >
            <option value="">All Universities</option>
            {universities.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white py-1.5 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-brand-200 bg-white py-1.5 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-brand-200 pb-2">
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            statusFilter === ''
              ? 'bg-brand-900 text-white shadow-xs'
              : 'text-brand-600 hover:bg-brand-100 hover:text-brand-900'
          }`}
        >
          All Students
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Active Students</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('inactive')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            statusFilter === 'inactive'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300'
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Inactive Students</span>
        </button>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-brand-200 bg-brand-50 text-brand-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">NIAT ID</th>
                <th className="py-3 px-4">Section / University</th>
                <th className="py-3 px-4">Parent Details</th>
                <th className="py-3 px-4">Student Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 text-brand-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-brand-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                    <span className="mt-2 block text-xs">Loading student records...</span>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-brand-500">
                    <GraduationCap className="mx-auto h-8 w-8 text-brand-300" />
                    <span className="mt-2 block text-xs">No students registered yet</span>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-brand-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-brand-900">
                      {student.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-brand-900">
                      <Link
                        to={`/students/${student._id}/attendance`}
                        className="hover:text-brand-600 hover:underline font-semibold"
                        title="View Individual Attendance Sheet"
                      >
                        {student.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-brand-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-800">
                        {student.niatId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-brand-800">
                        {student.section?.name || '—'}
                      </p>
                      <p className="text-[11px] text-brand-400">
                        {student.university?.code || student.university?.name || '—'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-brand-800">{student.parentName}</p>
                      <p className="text-[11px] font-mono text-brand-500">
                        {student.parentPhone}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-brand-600">
                      {student.studentPhone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          student.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {student.status === 'active' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-slate-400" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/students/${student._id}/attendance`}
                          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-100 transition-colors"
                          title="View Attendance History"
                        >
                          <CalendarCheck className="h-4 w-4" />
                        </Link>
                        <StudentRowActionMenu
                          student={student}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          isSuperAdmin={isSuperAdmin}
                          onOpenTransfer={openTransferModal}
                          onOpenDeactivate={openDeactivateModal}
                          onOpenRestore={openRestoreModal}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border border-brand-200 bg-white p-6 shadow-lg my-8">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <h2 className="text-base font-semibold text-brand-900">
                {editingStudent ? 'Edit Student' : 'Add Student'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Chalapathi Roll Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rollNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, rollNumber: e.target.value })
                    }
                    placeholder="e.g., 22CIT0401"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    NIAT ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.niatId}
                    onChange={(e) =>
                      setFormData({ ...formData, niatId: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., NIAT-CIT-001"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono uppercase text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Ananya Sharma"
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Parent / Guardian Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parentName}
                    onChange={(e) =>
                      setFormData({ ...formData, parentName: e.target.value })
                    }
                    placeholder="e.g., Suresh Sharma"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Parent Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.parentPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, parentPhone: e.target.value })
                    }
                    placeholder="e.g., +91 98765 43210"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Student Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.studentPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, studentPhone: e.target.value })
                    }
                    placeholder="e.g., +91 98765 11111"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) =>
                      setFormData({ ...formData, academicYear: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    University *
                  </label>
                  <select
                    required
                    disabled={!!editingStudent}
                    value={formData.university}
                    onChange={(e) =>
                      setFormData({ ...formData, university: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none disabled:bg-slate-100"
                  >
                    <option value="">Select University</option>
                    {universities.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Section *
                  </label>
                  <select
                    required
                    disabled={!!editingStudent}
                    value={formData.section}
                    onChange={(e) =>
                      setFormData({ ...formData, section: e.target.value })
                    }
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none disabled:bg-slate-100"
                  >
                    <option value="">Select Section</option>
                    {sections
                      .filter(
                        (s) =>
                          !formData.university ||
                          s.university?._id === formData.university ||
                          s.university === formData.university
                      )
                      .map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-60"
                >
                  {submitting
                    ? 'Saving...'
                    : editingStudent
                    ? 'Update Student'
                    : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Section Modal */}
      {isTransferOpen && transferringStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-brand-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <h2 className="text-base font-semibold text-brand-900">
                Transfer Student to Section
              </h2>
              <button
                onClick={() => setIsTransferOpen(false)}
                className="rounded p-1 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-brand-500">Student:</p>
                <p className="text-sm font-semibold text-brand-900">
                  {transferringStudent.name} ({transferringStudent.rollNumber})
                </p>
                <p className="text-xs text-brand-500 mt-1">
                  Current Section: <span className="font-medium text-brand-700">{transferringStudent.section?.name}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  New Target Section *
                </label>
                <select
                  required
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                >
                  <option value="">Select Destination Section</option>
                  {sections
                    .filter(
                      (s) =>
                        s._id !== (transferringStudent.section?._id || transferringStudent.section) &&
                        (s.university?._id === (transferringStudent.university?._id || transferringStudent.university) ||
                         s.university === (transferringStudent.university?._id || transferringStudent.university))
                    )
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code}) - {s.semester}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-100">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="rounded-lg border border-brand-200 px-3.5 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800"
                >
                  Transfer Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Modal */}
      {deactivatingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Deactivate Student
                  </h2>
                  <p className="text-xs text-slate-500">
                    Remove student from active attendance lists
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeactivatingStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Student identification card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Student Name:</span>
                  <strong className="text-slate-900 text-sm">{deactivatingStudent.name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Roll Number:</span>
                  <span className="font-mono font-semibold text-slate-800">{deactivatingStudent.rollNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">NIAT ID:</span>
                  <span className="font-mono font-semibold text-brand-800">{deactivatingStudent.niatId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">University:</span>
                  <span className="font-medium text-slate-800">
                    {deactivatingStudent.university?.name || deactivatingStudent.university?.code || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Section:</span>
                  <span className="font-medium text-slate-800">
                    {deactivatingStudent.section?.name || deactivatingStudent.section?.code || '—'}
                  </span>
                </div>
              </div>

              {/* Offline pending check alert */}
              {hasPendingOfflineRecords && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Unsynchronized Offline Attendance Records Detected</p>
                    <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                      There are unsynchronized offline attendance changes stored locally for this student. We strongly recommend synchronizing before deactivating to preserve these records.
                    </p>
                  </div>
                </div>
              )}

              {/* Warning explanation banner */}
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/70 p-3 text-red-900">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold block text-red-950">Important Notice</span>
                  Deactivating this student will remove them from daily attendance marking sheets, active rosters, and register exports. All historical attendance records, percentages, and audit logs are permanently preserved and can be viewed or restored at any time.
                </div>
              </div>

              {/* Optional Reason Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Deactivation (Optional)
                </label>
                <input
                  type="text"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="e.g., Transfer to other college, Discontinued course, Left institution"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeactivatingStudent(null)}
                  disabled={deactivating}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeactivate}
                  disabled={deactivating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 active:scale-98 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {deactivating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{deactivating ? 'Deactivating...' : 'Confirm Deactivation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoringStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <RotateCcw className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Restore Student to Roster
                  </h2>
                  <p className="text-xs text-slate-500">
                    Re-enroll student in active section
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoringStudent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Are you sure you want to restore{' '}
                <strong className="text-slate-900">{restoringStudent.name}</strong> (Roll:{' '}
                <span className="font-mono font-semibold">{restoringStudent.rollNumber}</span>)?
                The student will immediately reappear on daily attendance marking sheets and active lists.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestoringStudent(null)}
                  disabled={restoring}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={restoring}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 active:scale-98 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {restoring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{restoring ? 'Restoring...' : 'Restore Student'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6-Step Guided Excel Import Modal */}
      <StudentImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        universities={universities}
        sections={sections}
        initialUniversity={universityFilter || universities[0]?._id || ''}
        initialSection={sectionFilter || sections[0]?._id || ''}
        onImportSuccess={() => {
          fetchData();
          setSuccess('Student roster updated from Excel import');
          setTimeout(() => setSuccess(''), 4000);
        }}
      />
    </div>
  );
}

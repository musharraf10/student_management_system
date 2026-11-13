import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import studentService from '../../services/studentService';
import universityService from '../../services/universityService';
import sectionService from '../../services/sectionService';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Layers,
  User,
  Phone,
} from 'lucide-react';

export default function StudentFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isSuperAdmin, hasPermission } = useAuth();

  const canManage = isSuperAdmin || hasPermission(isEdit ? 'editStudents' : 'addStudents');

  const [universities, setUniversities] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    rollNumber: '',
    niatId: '',
    name: '',
    parentName: '',
    parentPhone: '',
    studentPhone: '',
    university: '',
    section: '',
    academicYear: '2026-2027',
    status: 'active',
  });

  // 1. Fetch reference lists (universities & sections)
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [uniRes, secRes] = await Promise.all([
          universityService.getUniversities({ status: 'active' }),
          sectionService.getSections({ status: 'active' }),
        ]);
        setUniversities(uniRes.data || []);
        setSections(secRes.data || []);

        if (!isEdit && uniRes.data?.length > 0 && !formData.university) {
          setFormData((prev) => ({
            ...prev,
            university: uniRes.data[0]._id,
          }));
        }
      } catch (err) {
        setError('Failed to load universities or sections');
      }
    };
    loadRefs();
  }, [isEdit]);

  // 2. Fetch existing student if editing
  useEffect(() => {
    if (isEdit) {
      const loadStudent = async () => {
        try {
          setLoading(true);
          const res = await studentService.getStudentById(id);
          const s = res.data;
          setFormData({
            rollNumber: s.rollNumber || '',
            niatId: s.niatId || '',
            name: s.name || '',
            parentName: s.parentName || '',
            parentPhone: s.parentPhone || '',
            studentPhone: s.studentPhone || '',
            university: s.university?._id || s.university || '',
            section: s.section?._id || s.section || '',
            academicYear: s.academicYear || '2026-2027',
            status: s.status || 'active',
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load student details');
        } finally {
          setLoading(false);
        }
      };
      loadStudent();
    }
  }, [id, isEdit]);

  // Filter sections by selected university
  const filteredSections = sections.filter((sec) => {
    if (!formData.university) return true;
    const secUniId = sec.university?._id || sec.university;
    return secUniId?.toString() === formData.university.toString();
  });

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      setError('You do not have permission to perform this action');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (isEdit) {
        await studentService.updateStudent(id, formData);
        setSuccess('Student updated successfully');
      } else {
        await studentService.createStudent(formData);
        setSuccess('Student registered successfully');
      }

      setTimeout(() => {
        navigate('/students');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save student record');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
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
            {isEdit ? `Edit ${formData.name || 'Student'}` : 'Register New Student'}
          </span>
        </nav>

        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Students Directory</span>
        </Link>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-900">
          {isEdit ? 'Edit Student Details' : 'Register New Student'}
        </h1>
        <p className="mt-0.5 text-xs text-brand-500">
          {isEdit
            ? 'Update academic profile, parent contact details, or institutional status'
            : 'Enroll a new student into university section roster for centralized attendance tracking'}
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs"
      >
        <div className="border-b border-brand-100 bg-brand-50/60 p-4">
          <h2 className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-brand-600" />
            <span>Student Registration Form</span>
          </h2>
        </div>

        <div className="p-5 space-y-6">
          {/* Section 1: Academic & Institutional Identifiers */}
          <div>
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
              1. Academic & University Placement
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Full Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Rajesh Kumar"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  University / Institution *
                </label>
                <select
                  required
                  value={formData.university}
                  onChange={(e) => {
                    const newUni = e.target.value;
                    const validSecs = sections.filter((s) => (s.university?._id || s.university) === newUni);
                    setFormData({
                      ...formData,
                      university: newUni,
                      section: validSecs[0]?._id || '',
                    });
                  }}
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
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
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Assigned Section *
                </label>
                <select
                  required
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                >
                  <option value="">Select Section</option>
                  {filteredSections.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code}) - Sem {s.semester}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Academic Year *
                </label>
                <input
                  type="text"
                  required
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder="2026-2027"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Student Identifiers */}
          <div className="border-t border-brand-100 pt-5">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
              2. Student ID & Roll Number
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Chalapathi Roll Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g., Y22CS001"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  NIAT ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.niatId}
                  onChange={(e) => setFormData({ ...formData, niatId: e.target.value })}
                  placeholder="e.g., NIAT-001"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact Details */}
          <div className="border-t border-brand-100 pt-5">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
              3. Family & Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Parent / Guardian Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  placeholder="e.g., S. Venkat"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Parent Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="e.g., 9876543210"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Student Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.studentPhone}
                  onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value })}
                  placeholder="e.g., 9123456780"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Status */}
          <div className="border-t border-brand-100 pt-5">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
              4. Enrollment Status
            </h3>
            <div className="max-w-xs">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              >
                <option value="active">Active Enrolled</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between border-t border-brand-100 bg-brand-50/60 p-4">
          <Link
            to="/students"
            className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-medium text-brand-600 hover:bg-white"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{isEdit ? 'Save Changes' : 'Register Student'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

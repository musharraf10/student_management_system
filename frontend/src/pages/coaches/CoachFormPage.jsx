import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import coachService from '../../services/coachService';
import universityService from '../../services/universityService';
import sectionService from '../../services/sectionService';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Key,
  Building2,
  Layers,
  Lock,
} from 'lucide-react';

export default function CoachFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [universities, setUniversities] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    status: 'active',
    assignedUniversities: [],
    assignedSections: [],
    permissions: {
      addStudents: false,
      editStudents: false,
      editAttendance: false,
      exportReports: false,
    },
  });

  // 1. Fetch universities & sections
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [uniRes, secRes] = await Promise.all([
          universityService.getUniversities({ status: 'active' }),
          sectionService.getSections({ status: 'active' }),
        ]);
        setUniversities(uniRes.data || []);
        setSections(secRes.data || []);
      } catch (err) {
        setError('Failed to load universities or sections');
      }
    };
    loadRefs();
  }, []);

  // 2. Fetch coach if editing
  useEffect(() => {
    if (isEdit) {
      const loadCoach = async () => {
        try {
          setLoading(true);
          const res = await coachService.getCoachById(id);
          const c = res.data;
          setFormData({
            name: c.name || '',
            email: c.email || '',
            password: '', // Leave blank unless updating
            phone: c.phone || '',
            status: c.status || 'active',
            assignedUniversities: (c.assignedUniversities || []).map((u) => u._id || u),
            assignedSections: (c.assignedSections || []).map((s) => s._id || s),
            permissions: {
              addStudents: Boolean(c.permissions?.addStudents),
              editStudents: Boolean(c.permissions?.editStudents),
              editAttendance: Boolean(c.permissions?.editAttendance),
              exportReports: Boolean(c.permissions?.exportReports),
            },
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load coach details');
        } finally {
          setLoading(false);
        }
      };
      loadCoach();
    }
  }, [id, isEdit]);

  const handleUniToggle = (uniId) => {
    setFormData((prev) => {
      const current = prev.assignedUniversities || [];
      if (current.includes(uniId)) {
        return {
          ...prev,
          assignedUniversities: current.filter((u) => u !== uniId),
        };
      } else {
        return {
          ...prev,
          assignedUniversities: [...current, uniId],
        };
      }
    });
  };

  const handleSectionToggle = (secId) => {
    setFormData((prev) => {
      const current = prev.assignedSections || [];
      if (current.includes(secId)) {
        return {
          ...prev,
          assignedSections: current.filter((s) => s !== secId),
        };
      } else {
        return {
          ...prev,
          assignedSections: [...current, secId],
        };
      }
    });
  };

  const handlePermissionToggle = (permKey) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey],
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError('Only Super Admin can manage Success Coach accounts');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = { ...formData };
      if (isEdit && !payload.password) {
        delete payload.password;
      }

      if (isEdit) {
        await coachService.updateCoach(id, payload);
        setSuccess('Coach profile and permissions updated successfully');
      } else {
        await coachService.createCoach(payload);
        setSuccess('Success Coach registered successfully');
      }

      setTimeout(() => {
        navigate('/coaches');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save coach profile');
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
      {/* Breadcrumbs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-2 text-xs text-brand-500">
          <Link to="/dashboard" className="hover:text-brand-900">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/coaches" className="hover:text-brand-900">
            Success Coaches
          </Link>
          <span>/</span>
          <span className="font-semibold text-brand-900">
            {isEdit ? `Edit ${formData.name || 'Coach'}` : 'Register Success Coach'}
          </span>
        </nav>

        <Link
          to="/coaches"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Coaches Directory</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-900">
          {isEdit ? 'Edit Success Coach Profile' : 'Register New Success Coach'}
        </h1>
        <p className="mt-0.5 text-xs text-brand-500">
          {isEdit
            ? 'Configure institutional assignments, login credentials, and granular capabilities'
            : 'Create an authorized instructor account with section-level isolation and role permissions'}
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
            <Users className="h-4 w-4 text-brand-600" />
            <span>Success Coach Information & Permissions</span>
          </h2>
        </div>

        <div className="p-5 space-y-6">
          {/* 1. Account Details */}
          <div>
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
              1. Basic Account Information
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Prof. K. Ramesh"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Email Address (Login Username) *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramesh@portal.edu"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  {isEdit ? 'New Password (Leave blank to keep existing)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!isEdit}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEdit ? '••••••••' : 'Minimum 6 characters'}
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., 9876543210"
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono text-brand-900 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Institutional & Section Assignments */}
          <div className="border-t border-brand-100 pt-5">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
              2. Data Isolation & Assignments
            </h3>
            <p className="text-xs text-brand-500 mb-3">
              Coaches can only access student lists, mark attendance, and generate reports for their assigned sections.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assigned Universities */}
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-2">
                  Assigned Universities
                </label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-brand-200 bg-brand-50/30 p-2.5 space-y-1.5">
                  {universities.map((u) => {
                    const isSelected = (formData.assignedUniversities || []).includes(u._id);
                    return (
                      <label
                        key={u._id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleUniToggle(u._id)}
                          className="h-3.5 w-3.5 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-medium text-brand-900">{u.name} ({u.code})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Sections */}
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-2">
                  Assigned Sections
                </label>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-brand-200 bg-brand-50/30 p-2.5 space-y-1.5">
                  {sections.map((s) => {
                    const isSelected = (formData.assignedSections || []).includes(s._id);
                    return (
                      <label
                        key={s._id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSectionToggle(s._id)}
                          className="h-3.5 w-3.5 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-medium text-brand-900">
                          {s.name} ({s.code}) - {s.university?.code || 'Uni'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Granular Role Permissions */}
          <div className="border-t border-brand-100 pt-5">
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-3">
              3. Granular Capabilities & Feature Permissions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  formData.permissions.addStudents
                    ? 'border-brand-600 bg-brand-50/60'
                    : 'border-brand-200 bg-white hover:bg-brand-50/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.permissions.addStudents}
                  onChange={() => handlePermissionToggle('addStudents')}
                  className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="font-semibold text-brand-900">Add New Students</p>
                  <p className="text-brand-500 text-[11px] mt-0.5">
                    Permission to register single students or stream Excel import rosters.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  formData.permissions.editStudents
                    ? 'border-brand-600 bg-brand-50/60'
                    : 'border-brand-200 bg-white hover:bg-brand-50/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.permissions.editStudents}
                  onChange={() => handlePermissionToggle('editStudents')}
                  className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="font-semibold text-brand-900">Edit Student Profiles</p>
                  <p className="text-brand-500 text-[11px] mt-0.5">
                    Modify contact details, phone numbers, and active/inactive status.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  formData.permissions.editAttendance
                    ? 'border-brand-600 bg-brand-50/60'
                    : 'border-brand-200 bg-white hover:bg-brand-50/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.permissions.editAttendance}
                  onChange={() => handlePermissionToggle('editAttendance')}
                  className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="font-semibold text-brand-900">Edit Submitted Attendance</p>
                  <p className="text-brand-500 text-[11px] mt-0.5">
                    Authorize retroactive attendance modifications with required audit justification.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  formData.permissions.exportReports
                    ? 'border-brand-600 bg-brand-50/60'
                    : 'border-brand-200 bg-white hover:bg-brand-50/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.permissions.exportReports}
                  onChange={() => handlePermissionToggle('exportReports')}
                  className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <p className="font-semibold text-brand-900">Export Excel Reports</p>
                  <p className="text-brand-500 text-[11px] mt-0.5">
                    Download section monthly attendance matrices and institutional summaries.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-brand-100 bg-brand-50/60 p-4">
          <Link
            to="/coaches"
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
            <span>{isEdit ? 'Save Coach Profile' : 'Register Coach'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

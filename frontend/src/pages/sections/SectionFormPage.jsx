import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import sectionService from '../../services/sectionService';
import universityService from '../../services/universityService';
import coachService from '../../services/coachService';
import { useAuth } from '../../context/AuthContext';
import {
  Layers,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Calendar,
  Users,
} from 'lucide-react';

export default function SectionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [universities, setUniversities] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    university: '',
    academicYear: '2026-2027',
    semester: 'Semester 1',
    assignedCoaches: [],
    status: 'active',
  });

  // 1. Fetch universities & coaches
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [uniRes, coachRes] = await Promise.all([
          universityService.getUniversities({ status: 'active' }),
          coachService.getCoaches({ status: 'active' }),
        ]);
        setUniversities(uniRes.data || []);
        setCoaches(coachRes.data || []);

        if (!isEdit && uniRes.data?.length > 0 && !formData.university) {
          setFormData((prev) => ({
            ...prev,
            university: uniRes.data[0]._id,
          }));
        }
      } catch (err) {
        setError('Failed to load universities or coaches');
      }
    };
    loadRefs();
  }, [isEdit]);

  // 2. Fetch section if editing
  useEffect(() => {
    if (isEdit) {
      const loadSection = async () => {
        try {
          setLoading(true);
          const res = await sectionService.getSectionById(id);
          const s = res.data;
          setFormData({
            name: s.name || '',
            code: s.code || '',
            university: s.university?._id || s.university || '',
            academicYear: s.academicYear || '2026-2027',
            semester: s.semester || 'Semester 1',
            assignedCoaches: (s.assignedCoaches || []).map((c) => c._id || c),
            status: s.status || 'active',
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load section');
        } finally {
          setLoading(false);
        }
      };
      loadSection();
    }
  }, [id, isEdit]);

  const handleCoachToggle = (coachId) => {
    setFormData((prev) => {
      const current = prev.assignedCoaches || [];
      if (current.includes(coachId)) {
        return {
          ...prev,
          assignedCoaches: current.filter((c) => c !== coachId),
        };
      } else {
        return {
          ...prev,
          assignedCoaches: [...current, coachId],
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError('Only Super Admin / Zonal Manager can configure classroom sections');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (isEdit) {
        await sectionService.updateSection(id, formData);
        setSuccess('Section updated successfully');
      } else {
        await sectionService.createSection(formData);
        setSuccess('Section created successfully');
      }

      setTimeout(() => {
        navigate('/sections');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section');
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex items-center gap-2 text-xs text-brand-500">
          <Link to="/dashboard" className="hover:text-brand-900">
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/sections" className="hover:text-brand-900">
            Sections
          </Link>
          <span>/</span>
          <span className="font-semibold text-brand-900">
            {isEdit ? `Edit ${formData.name || 'Section'}` : 'Create Classroom Section'}
          </span>
        </nav>

        <Link
          to="/sections"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Sections</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-900">
          {isEdit ? 'Edit Section Configuration' : 'Create New Classroom Section'}
        </h1>
        <p className="mt-0.5 text-xs text-brand-500">
          {isEdit
            ? 'Adjust section identifiers, semester details, and assigned success coaches'
            : 'Configure a new cohort section under an institution for student enrollment and attendance'}
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
            <Layers className="h-4 w-4 text-brand-600" />
            <span>Section Configuration Form</span>
          </h2>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Section Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., CSE - Section A"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Section Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g., CIET-CSE-A"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono font-bold text-brand-900 focus:border-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                University *
              </label>
              <select
                required
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
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

            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Semester *
              </label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
              </select>
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

          {/* Coach Assignment Section */}
          <div className="border-t border-brand-100 pt-4">
            <label className="block text-xs font-medium text-brand-700 mb-2">
              Assign Success Coaches (Select one or more)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-brand-200 rounded-lg p-3 bg-brand-50/30">
              {coaches.map((c) => {
                const isSelected = (formData.assignedCoaches || []).includes(c._id);
                return (
                  <label
                    key={c._id}
                    className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-900 font-semibold'
                        : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCoachToggle(c._id)}
                      className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div className="truncate">
                      <p className="truncate">{c.name}</p>
                      <p className="text-[10px] text-brand-400 font-normal truncate">
                        {c.email}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-brand-100 bg-brand-50/60 p-4">
          <Link
            to="/sections"
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
            <span>{isEdit ? 'Save Section' : 'Create Section'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

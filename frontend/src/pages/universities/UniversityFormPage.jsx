import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import universityService from '../../services/universityService';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Tag,
} from 'lucide-react';

export default function UniversityFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    status: 'active',
  });

  // Fetch existing university if editing
  useEffect(() => {
    if (isEdit) {
      const loadUniversity = async () => {
        try {
          setLoading(true);
          const res = await universityService.getUniversityById(id);
          const u = res.data;
          setFormData({
            name: u.name || '',
            code: u.code || '',
            location: u.location || '',
            status: u.status || 'active',
          });
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load university');
        } finally {
          setLoading(false);
        }
      };
      loadUniversity();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setError('Only Super Admin can manage universities');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (isEdit) {
        await universityService.updateUniversity(id, formData);
        setSuccess('University updated successfully');
      } else {
        await universityService.createUniversity(formData);
        setSuccess('University registered successfully');
      }

      setTimeout(() => {
        navigate('/universities');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save university');
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
          <Link to="/universities" className="hover:text-brand-900">
            Universities
          </Link>
          <span>/</span>
          <span className="font-semibold text-brand-900">
            {isEdit ? `Edit ${formData.name || 'University'}` : 'Register University'}
          </span>
        </nav>

        <Link
          to="/universities"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Universities</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-brand-900">
          {isEdit ? 'Edit University' : 'Register New University'}
        </h1>
        <p className="mt-0.5 text-xs text-brand-500">
          {isEdit
            ? 'Modify institutional profile, acronym code, or status'
            : 'Add a new educational institution to the centralized attendance portal ecosystem'}
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
            <Building2 className="h-4 w-4 text-brand-600" />
            <span>University Profile</span>
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1">
              University / Institution Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Chalapathi Institute of Engineering and Technology"
              className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Institutional Code (Unique Acronym) *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g., CIET"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono font-bold text-brand-900 focus:border-brand-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Location / Campus *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Guntur, Andhra Pradesh"
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-700 mb-1">
              Operational Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="block w-full max-w-xs rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-brand-100 bg-brand-50/60 p-4">
          <Link
            to="/universities"
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
            <span>{isEdit ? 'Save Changes' : 'Create University'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

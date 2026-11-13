import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import universityService from '../../services/universityService';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function UniversityListPage() {
  const { isSuperAdmin } = useAuth();
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await universityService.getUniversities(params);
      setUniversities(res.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load universities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUniversities();
  };

  const openCreateModal = () => {
    setEditingUniversity(null);
    setFormData({
      name: '',
      code: '',
      location: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (university) => {
    setEditingUniversity(university);
    setFormData({
      name: university.name,
      code: university.code,
      location: university.location,
      status: university.status,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingUniversity) {
        await universityService.updateUniversity(editingUniversity._id, formData);
        setSuccess('University updated successfully');
      } else {
        await universityService.createUniversity(formData);
        setSuccess('University created successfully');
      }
      setIsModalOpen(false);
      fetchUniversities();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save university');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (university) => {
    try {
      const newStatus = university.status === 'active' ? 'inactive' : 'active';
      await universityService.updateUniversity(university._id, { status: newStatus });
      fetchUniversities();
      setSuccess(`University marked as ${newStatus}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update university status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">University Management</h1>
          <p className="mt-0.5 text-xs text-brand-500">
            Configure universities under the centralized portal ecosystem
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/universities/calendar"
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3.5 py-2 text-xs font-medium text-brand-700 shadow-xs hover:bg-brand-50 transition-colors"
            >
              <Calendar className="h-4 w-4 text-brand-600" />
              <span>University Calendar</span>
            </Link>
            <Link
              to="/universities/create"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3.5 py-2 text-xs font-medium text-white shadow-xs hover:bg-brand-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add University</span>
            </Link>
          </div>
        )}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code or city..."
            className="block w-full rounded-lg border border-brand-200 bg-white py-2 pl-9 pr-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-brand-600">Status:</label>
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

      {/* Universities Table */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-brand-200 bg-brand-50 text-brand-700 font-semibold">
              <tr>
                <th className="py-3 px-4">University Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 text-brand-800">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-brand-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                    <span className="mt-2 block text-xs">Loading universities...</span>
                  </td>
                </tr>
              ) : universities.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-8 text-center text-brand-500">
                    <Building2 className="mx-auto h-8 w-8 text-brand-300" />
                    <span className="mt-2 block text-xs">No universities found</span>
                  </td>
                </tr>
              ) : (
                universities.map((uni) => (
                  <tr key={uni._id} className="hover:bg-brand-50/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-brand-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-brand-500 shrink-0" />
                      <span>{uni.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-brand-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-800">
                        {uni.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-brand-600">{uni.location}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          uni.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {uni.status === 'active' ? (
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
                    <td className="py-3 px-4 text-brand-500">
                      {new Date(uni.createdAt).toLocaleDateString()}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/universities/${uni._id}/edit`}
                            className="rounded p-1.5 text-brand-600 hover:bg-brand-100 transition-colors"
                            title="Edit University"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => toggleStatus(uni)}
                            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                              uni.status === 'active'
                                ? 'text-red-700 hover:bg-red-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {uni.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit University Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-brand-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <h2 className="text-base font-semibold text-brand-900">
                {editingUniversity ? 'Edit University' : 'Add University'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-brand-700">
                  University Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Chalapathi Institute of Technology"
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  University Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., CIT"
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono uppercase text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  Location / City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="e.g., Guntur, Andhra Pradesh"
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                />
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
                  {submitting ? 'Saving...' : editingUniversity ? 'Update University' : 'Create University'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

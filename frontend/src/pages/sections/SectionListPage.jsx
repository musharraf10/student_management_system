import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import sectionService from '../../services/sectionService';
import universityService from '../../services/universityService';
import coachService from '../../services/coachService';
import { useAuth } from '../../context/AuthContext';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Users,
} from 'lucide-react';

export default function SectionListPage() {
  const { isSuperAdmin } = useAuth();
  const [sections, setSections] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('');

  // Notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    university: '',
    academicYear: '2025-2026',
    semester: 'Semester 1',
    assignedCoaches: [],
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (universityFilter) params.university = universityFilter;
      if (statusFilter) params.status = statusFilter;
      if (academicYearFilter) params.academicYear = academicYearFilter;

      const [sectionRes, uniRes] = await Promise.all([
        sectionService.getSections(params),
        universityService.getUniversities(),
      ]);

      setSections(sectionRes.data || []);
      setUniversities(uniRes.data || []);

      if (isSuperAdmin) {
        const coachRes = await coachService.getCoaches();
        setCoaches(coachRes.data || []);
      }

      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [universityFilter, statusFilter, academicYearFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const openCreateModal = () => {
    setEditingSection(null);
    setFormData({
      name: '',
      code: '',
      university: universities[0]?._id || '',
      academicYear: '2025-2026',
      semester: 'Semester 1',
      assignedCoaches: [],
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (section) => {
    setEditingSection(section);
    setFormData({
      name: section.name,
      code: section.code,
      university: section.university?._id || section.university || '',
      academicYear: section.academicYear,
      semester: section.semester,
      assignedCoaches: (section.assignedCoaches || []).map((c) => c._id || c),
      status: section.status,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingSection) {
        await sectionService.updateSection(editingSection._id, formData);
        setSuccess('Section updated successfully');
      } else {
        await sectionService.createSection(formData);
        setSuccess('Section created successfully');
      }
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save section');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCoachToggle = (coachId) => {
    const current = [...formData.assignedCoaches];
    const index = current.indexOf(coachId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(coachId);
    }
    setFormData({ ...formData, assignedCoaches: current });
  };

  const toggleStatus = async (section) => {
    try {
      const newStatus = section.status === 'active' ? 'inactive' : 'active';
      await sectionService.updateSection(section._id, { status: newStatus });
      fetchData();
      setSuccess(`Section marked as ${newStatus}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update section status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">Section Management</h1>
          <p className="mt-0.5 text-xs text-brand-500">
            {isSuperAdmin
              ? 'Organize classrooms, academic terms, and assign Success Coaches'
              : 'Sections and classrooms assigned to you'}
          </p>
        </div>
        {isSuperAdmin && (
          <Link
            to="/sections/create"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-brand-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Section</span>
          </Link>
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
      <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-brand-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by section name or code..."
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

      {/* Sections Table */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-brand-200 bg-brand-50 text-brand-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Section Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">University</th>
                <th className="py-3 px-4">Term</th>
                <th className="py-3 px-4">Assigned Coaches</th>
                <th className="py-3 px-4">Status</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 text-brand-800">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="py-8 text-center text-brand-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                    <span className="mt-2 block text-xs">Loading sections...</span>
                  </td>
                </tr>
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="py-8 text-center text-brand-500">
                    <Layers className="mx-auto h-8 w-8 text-brand-300" />
                    <span className="mt-2 block text-xs">No sections found</span>
                  </td>
                </tr>
              ) : (
                sections.map((sec) => (
                  <tr key={sec._id} className="hover:bg-brand-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-brand-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-brand-500 shrink-0" />
                      <span>{sec.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-brand-100 px-2 py-0.5 font-mono text-[11px] font-medium text-brand-800">
                        {sec.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-brand-700">
                      {sec.university?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-brand-600">
                      {sec.academicYear} &bull; {sec.semester}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {sec.assignedCoaches?.length > 0 ? (
                          sec.assignedCoaches.map((c) => (
                            <span
                              key={c._id || c}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-brand-700"
                            >
                              <Users className="h-3 w-3 text-brand-400" />
                              {c.name || 'Coach'}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          sec.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {sec.status === 'active' ? (
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
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/sections/${sec._id}/edit`}
                            className="rounded p-1.5 text-brand-600 hover:bg-brand-100 transition-colors"
                            title="Edit Section"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => toggleStatus(sec)}
                            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                              sec.status === 'active'
                                ? 'text-red-700 hover:bg-red-50'
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {sec.status === 'active' ? 'Deactivate' : 'Activate'}
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

      {/* Add / Edit Section Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-brand-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <h2 className="text-base font-semibold text-brand-900">
                {editingSection ? 'Edit Section' : 'Add Section'}
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
                    Section Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., CSE-A"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Section Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., CIT-CSE-A-2026"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs font-mono uppercase text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  University *
                </label>
                <select
                  required
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                >
                  <option value="">Select University</option>
                  {universities.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    placeholder="e.g., 2025-2026"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Semester *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: e.target.value })
                    }
                    placeholder="e.g., Semester 1"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Success Coach Assignment Checkboxes */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-brand-700 mb-1.5">
                    Assign Success Coaches
                  </label>
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-brand-200 bg-brand-50 p-2.5 space-y-1.5">
                    {coaches.length === 0 ? (
                      <p className="text-[11px] text-brand-400 italic">
                        No coaches available yet. Add coaches in Success Coach Management.
                      </p>
                    ) : (
                      coaches.map((c) => {
                        const isChecked = formData.assignedCoaches.includes(c._id);
                        return (
                          <label
                            key={c._id}
                            className="flex items-center gap-2 text-xs text-brand-800 cursor-pointer hover:bg-brand-100/60 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCoachToggle(c._id)}
                              className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                            />
                            <span className="font-medium">{c.name}</span>
                            <span className="text-[11px] text-brand-500 font-mono">
                              ({c.email})
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-brand-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                  {submitting ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

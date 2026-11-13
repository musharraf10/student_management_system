import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import coachService from '../../services/coachService';
import universityService from '../../services/universityService';
import sectionService from '../../services/sectionService';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Shield,
  Building2,
  Layers,
  Lock,
} from 'lucide-react';

export default function CoachListPage() {
  const [coaches, setCoaches] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState(null);
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
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const [coachRes, uniRes, secRes] = await Promise.all([
        coachService.getCoaches(params),
        universityService.getUniversities(),
        sectionService.getSections(),
      ]);

      setCoaches(coachRes.data || []);
      setUniversities(uniRes.data || []);
      setSections(secRes.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load coaches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const openCreateModal = () => {
    setEditingCoach(null);
    setFormData({
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
    setIsModalOpen(true);
  };

  const openEditModal = (coach) => {
    setEditingCoach(coach);
    setFormData({
      name: coach.name,
      email: coach.email,
      password: '', // Blank unless modifying
      phone: coach.phone || '',
      status: coach.status,
      assignedUniversities: (coach.assignedUniversities || []).map((u) => u._id || u),
      assignedSections: (coach.assignedSections || []).map((s) => s._id || s),
      permissions: {
        addStudents: !!coach.permissions?.addStudents,
        editStudents: !!coach.permissions?.editStudents,
        editAttendance: !!coach.permissions?.editAttendance,
        exportReports: !!coach.permissions?.exportReports,
      },
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = { ...formData };
      if (editingCoach && !payload.password) {
        delete payload.password; // Do not overwrite with empty password
      }

      if (editingCoach) {
        await coachService.updateCoach(editingCoach._id, payload);
        setSuccess('Success Coach updated successfully');
      } else {
        await coachService.createCoach(payload);
        setSuccess('Success Coach created successfully');
      }

      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save coach');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUniversityToggle = (uniId) => {
    const current = [...formData.assignedUniversities];
    const index = current.indexOf(uniId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(uniId);
    }
    setFormData({ ...formData, assignedUniversities: current });
  };

  const handleSectionToggle = (secId) => {
    const current = [...formData.assignedSections];
    const index = current.indexOf(secId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(secId);
    }
    setFormData({ ...formData, assignedSections: current });
  };

  const handlePermissionToggle = (permKey) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permKey]: !formData.permissions[permKey],
      },
    });
  };

  const toggleStatus = async (coach) => {
    try {
      const newStatus = coach.status === 'active' ? 'inactive' : 'active';
      await coachService.updateCoach(coach._id, { status: newStatus });
      fetchData();
      setSuccess(`Coach marked as ${newStatus}`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">Success Coach Management</h1>
          <p className="mt-0.5 text-xs text-brand-500">
            Create coach credentials, assign university sections, and control fine-grained permissions
          </p>
        </div>
        <Link
          to="/coaches/create"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-xs font-medium text-white shadow-xs hover:bg-brand-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Success Coach</span>
        </Link>
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
            placeholder="Search by name, email or phone..."
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

      {/* Coaches Table */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-brand-200 bg-brand-50 text-brand-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Success Coach</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Assigned Universities</th>
                <th className="py-3 px-4">Assigned Sections</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100 text-brand-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-brand-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
                    <span className="mt-2 block text-xs">Loading coaches...</span>
                  </td>
                </tr>
              ) : coaches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-brand-500">
                    <UserCheck className="mx-auto h-8 w-8 text-brand-300" />
                    <span className="mt-2 block text-xs">No success coaches found</span>
                  </td>
                </tr>
              ) : (
                coaches.map((coach) => (
                  <tr key={coach._id} className="hover:bg-brand-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-xs">
                          {coach.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-brand-900">{coach.name}</p>
                          <p className="text-[11px] text-brand-400 font-mono">{coach.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-brand-600">{coach.phone || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {coach.assignedUniversities?.length > 0 ? (
                          coach.assignedUniversities.map((u) => (
                            <span
                              key={u._id || u}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-brand-700 font-medium"
                            >
                              <Building2 className="h-3 w-3 text-brand-400" />
                              {u.code || u.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {coach.assignedSections?.length > 0 ? (
                          coach.assignedSections.map((s) => (
                            <span
                              key={s._id || s}
                              className="inline-flex items-center gap-1 rounded bg-brand-100 px-2 py-0.5 text-[11px] text-brand-800"
                            >
                              <Layers className="h-3 w-3 text-brand-500" />
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            coach.permissions?.addStudents
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          Add Student
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            coach.permissions?.editStudents
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          Edit Student
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            coach.permissions?.editAttendance
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          Edit Attend
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            coach.permissions?.exportReports
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          Export
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          coach.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {coach.status === 'active' ? (
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
                          to={`/coaches/${coach._id}/edit`}
                          className="rounded p-1.5 text-brand-600 hover:bg-brand-100 transition-colors"
                          title="Edit Coach & Permissions"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => toggleStatus(coach)}
                          className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                            coach.status === 'active'
                              ? 'text-red-700 hover:bg-red-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {coach.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Coach Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border border-brand-200 bg-white p-6 shadow-lg my-8">
            <div className="flex items-center justify-between border-b border-brand-100 pb-3">
              <h2 className="text-base font-semibold text-brand-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand-700" />
                <span>{editingCoach ? 'Edit Success Coach' : 'Add Success Coach'}</span>
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
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Ramesh Kumar"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="coach@university.edu"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Password {editingCoach ? '(Leave blank to keep existing)' : '*'}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="password"
                      required={!editingCoach}
                      minLength={6}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="mt-1 block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Universities Checklist */}
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Assign Universities
                </label>
                <div className="max-h-28 overflow-y-auto rounded-lg border border-brand-200 bg-brand-50 p-2 space-y-1">
                  {universities.map((u) => (
                    <label
                      key={u._id}
                      className="flex items-center gap-2 text-xs text-brand-800 cursor-pointer hover:bg-brand-100/60 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assignedUniversities.includes(u._id)}
                        onChange={() => handleUniversityToggle(u._id)}
                        className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                      />
                      <span>{u.name}</span>
                      <span className="font-mono text-[10px] text-brand-400">({u.code})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sections Checklist */}
              <div>
                <label className="block text-xs font-medium text-brand-700 mb-1">
                  Assign Sections
                </label>
                <div className="max-h-28 overflow-y-auto rounded-lg border border-brand-200 bg-brand-50 p-2 space-y-1">
                  {sections.length === 0 ? (
                    <p className="text-[11px] text-brand-400 italic">No sections created yet.</p>
                  ) : (
                    sections.map((s) => (
                      <label
                        key={s._id}
                        className="flex items-center gap-2 text-xs text-brand-800 cursor-pointer hover:bg-brand-100/60 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedSections.includes(s._id)}
                          onChange={() => handleSectionToggle(s._id)}
                          className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                        />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-[11px] text-brand-500">
                          ({s.university?.name || 'Uni'}) &bull; {s.academicYear}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Fine-grained Permissions */}
              <div className="rounded-lg border border-brand-200 bg-brand-50/70 p-3.5">
                <p className="text-xs font-semibold text-brand-900 mb-2">
                  Special Permissions (Disabled by default)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs text-brand-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.addStudents}
                      onChange={() => handlePermissionToggle('addStudents')}
                      className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                    />
                    <span>addStudents (Register students)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-brand-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.editStudents}
                      onChange={() => handlePermissionToggle('editStudents')}
                      className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                    />
                    <span>editStudents (Modify student info)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-brand-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.editAttendance}
                      onChange={() => handlePermissionToggle('editAttendance')}
                      className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                    />
                    <span>editAttendance (Modify submitted)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-brand-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.permissions.exportReports}
                      onChange={() => handlePermissionToggle('exportReports')}
                      className="rounded border-brand-300 text-brand-700 focus:ring-brand-500"
                    />
                    <span>exportReports (Download Excel)</span>
                  </label>
                </div>
              </div>

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
                  {submitting ? 'Saving...' : editingCoach ? 'Update Coach' : 'Create Coach'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import universityService from '../../services/universityService';
import attendanceService from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Layers,
  Info,
  RotateCcw,
} from 'lucide-react';

export default function UniversityCalendarPage() {
  const { isSuperAdmin } = useAuth();

  const [universities, setUniversities] = useState([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dayType, setDayType] = useState('holiday'); // 'holiday' | 'sunday'
  const [holidayReason, setHolidayReason] = useState('');

  // Sunday Auto-detection
  const [isDetectedSunday, setIsDetectedSunday] = useState(false);

  // Preview & Conflict State
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [overwriteConfirm, setOverwriteConfirm] = useState(false);

  // Application State
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Fetch universities
  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const res = await universityService.getUniversities();
        const list = res.data || [];
        setUniversities(list);
        if (list.length > 0 && !selectedUniversityId) {
          setSelectedUniversityId(list[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load universities');
      }
    };
    loadUniversities();
  }, []);

  // 2. Check if selected date is Sunday
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const isSunday = d.getUTCDay() === 0;
      setIsDetectedSunday(isSunday);
      if (isSunday) {
        setDayType('sunday');
      }
    }
  }, [selectedDate]);

  // 3. Handle Preview
  const handlePreview = async (e) => {
    e.preventDefault();
    if (!selectedUniversityId || !selectedDate) return;

    if (dayType === 'holiday' && !holidayReason.trim()) {
      setError('Please provide a reason or festival title for the holiday');
      return;
    }

    try {
      setPreviewing(true);
      setError('');
      setSuccess('');
      setApplyResult(null);
      setOverwriteConfirm(false);

      const res = await attendanceService.previewUniversityCalendar({
        universityId: selectedUniversityId,
        date: selectedDate,
        dayType,
        holidayReason,
      });

      setPreviewData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate preview');
    } finally {
      setPreviewing(false);
    }
  };

  // 4. Handle Apply
  const handleApply = async () => {
    if (!previewData) return;

    if (previewData.hasConflicts && !overwriteConfirm) {
      setError('Please review and check the confirmation to authorize overwriting existing section attendance');
      return;
    }

    try {
      setApplying(true);
      setError('');

      const res = await attendanceService.applyUniversityCalendar({
        universityId: selectedUniversityId,
        date: selectedDate,
        dayType,
        holidayReason,
        overwriteConflicts: overwriteConfirm,
      });

      setApplyResult(res.data);
      setSuccess(`University calendar designation applied successfully to ${res.data.appliedCount} active sections`);
      setPreviewData(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply university calendar');
    } finally {
      setApplying(false);
    }
  };

  const selectedUni = universities.find((u) => u._id === selectedUniversityId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-900">
            University Calendar Management
          </h1>
          <p className="mt-0.5 text-xs text-brand-500">
            Designate institutional common holidays and Sundays across all active sections of a university
          </p>
        </div>

        <Link
          to="/attendance"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-900"
        >
          <span>Daily Attendance Sheet</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
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

      {/* Designation Form Card */}
      <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-xs">
        <div className="border-b border-brand-100 bg-brand-50/60 p-4">
          <h2 className="text-sm font-semibold text-brand-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-600" />
            <span>Select University & Calendar Designation</span>
          </h2>
          <p className="text-xs text-brand-500 mt-0.5">
            Bulk operations apply exclusively to the chosen university and will not impact other institutions
          </p>
        </div>

        <form onSubmit={handlePreview} className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* University Selector */}
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Select University *
              </label>
              <select
                value={selectedUniversityId}
                onChange={(e) => {
                  setSelectedUniversityId(e.target.value);
                  setPreviewData(null);
                  setApplyResult(null);
                }}
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              >
                {universities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPreviewData(null);
                  setApplyResult(null);
                }}
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              />
              {isDetectedSunday && (
                <p className="mt-1 text-[11px] font-medium text-brand-600 flex items-center gap-1">
                  <Info className="h-3 w-3 text-brand-500" />
                  <span>Sunday automatically identified</span>
                </p>
              )}
            </div>

            {/* Day Type Selector */}
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Day Type *
              </label>
              <select
                value={dayType}
                onChange={(e) => {
                  setDayType(e.target.value);
                  setPreviewData(null);
                }}
                className="block w-full rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              >
                <option value="holiday">Holiday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          </div>

          {/* Holiday Reason (when Holiday) */}
          {dayType === 'holiday' && (
            <div>
              <label className="block text-xs font-medium text-brand-700 mb-1">
                Holiday Reason / Title *
              </label>
              <input
                type="text"
                value={holidayReason}
                onChange={(e) => setHolidayReason(e.target.value)}
                placeholder="e.g. Festival Holiday, National Holiday, Annual Sports Day"
                className="block w-full max-w-xl rounded-lg border border-brand-200 bg-white py-2 px-3 text-xs text-brand-900 focus:border-brand-600 focus:outline-none"
              />
            </div>
          )}

          {/* Preview Trigger Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={previewing}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-brand-800 disabled:opacity-60 cursor-pointer"
            >
              {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Preview Affected Sections</span>
            </button>
          </div>
        </form>
      </div>

      {/* PREVIEW & CONFLICT REVIEW SECTION */}
      {previewData && (
        <div className="space-y-4 rounded-xl border border-brand-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-brand-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-brand-900">
                Review Affected Sections ({selectedUni?.name})
              </h3>
              <p className="text-xs text-brand-500">
                Target Date: <strong>{new Date(selectedDate).toDateString()}</strong> • Type:{' '}
                <strong className="capitalize">{dayType}</strong>
                {dayType === 'holiday' && ` (${holidayReason})`}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-md bg-brand-100 px-2.5 py-1 font-semibold text-brand-800">
                Total Sections: {previewData.totalActiveSections}
              </span>
              {previewData.conflictCount > 0 && (
                <span className="rounded-md bg-red-100 px-2.5 py-1 font-semibold text-red-800">
                  Conflicts: {previewData.conflictCount}
                </span>
              )}
            </div>
          </div>

          {/* Conflict Warning Box */}
          {previewData.hasConflicts && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                <span>Attendance Conflict Detected in {previewData.conflictCount} Section(s)</span>
              </div>
              <p className="text-xs text-red-700">
                One or more sections have already recorded classroom attendance on this date.
                Applying a common {dayType} will update their day type and reset individual student attendance records to conform with the institutional holiday policy.
              </p>
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-red-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteConfirm}
                    onChange={(e) => setOverwriteConfirm(e.target.checked)}
                    className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <span>
                    I confirm and explicitly authorize overwriting existing attendance for conflicting sections.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Sections List Table */}
          <div className="overflow-hidden rounded-lg border border-brand-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-50 text-brand-700 font-semibold border-b border-brand-200">
                <tr>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Current Day Status</th>
                  <th className="py-2.5 px-3">Action Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 text-brand-800">
                {previewData.sections.map((sec) => (
                  <tr
                    key={sec.sectionId}
                    className={
                      sec.status === 'conflict'
                        ? 'bg-red-50/30'
                        : sec.status === 'already_set'
                        ? 'bg-slate-50/50'
                        : ''
                    }
                  >
                    <td className="py-2.5 px-3 font-semibold text-brand-900">
                      {sec.sectionName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-brand-500">
                      {sec.sectionCode}
                    </td>
                    <td className="py-2.5 px-3">
                      {sec.status === 'new' && (
                        <span className="text-brand-500">Not recorded yet</span>
                      )}
                      {sec.status === 'already_set' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Already marked as {dayType}
                        </span>
                      )}
                      {sec.status === 'conflict' && sec.conflictDetails && (
                        <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                          Conflict: {sec.conflictDetails.existingDayType} (P:{' '}
                          {sec.conflictDetails.presentCount}, A:{' '}
                          {sec.conflictDetails.absentCount}) by{' '}
                          {sec.conflictDetails.submittedBy}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {sec.status === 'new' && (
                        <span className="text-emerald-700 font-medium">
                          Will apply {dayType}
                        </span>
                      )}
                      {sec.status === 'already_set' && (
                        <span className="text-slate-500">No change required</span>
                      )}
                      {sec.status === 'conflict' && (
                        <span className="text-red-700 font-bold">
                          {overwriteConfirm
                            ? `Will overwrite to ${dayType}`
                            : 'Will skip unless authorized'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Confirmation Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-brand-100">
            <button
              type="button"
              onClick={() => setPreviewData(null)}
              className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={applying || (previewData.hasConflicts && !overwriteConfirm)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
            >
              {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Confirm & Apply to All Active Sections</span>
            </button>
          </div>
        </div>
      )}

      {/* APPLY RESULT BANNER */}
      {applyResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Calendar Designation Successfully Applied</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-lg bg-white p-3 border border-emerald-100">
              <p className="text-brand-500">Total Sections</p>
              <p className="text-base font-bold text-brand-900 mt-0.5">
                {applyResult.totalSections}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-emerald-100">
              <p className="text-emerald-700 font-medium">Applied Sections</p>
              <p className="text-base font-bold text-emerald-700 mt-0.5">
                {applyResult.appliedCount}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-emerald-100">
              <p className="text-brand-500">Overwritten Conflicts</p>
              <p className="text-base font-bold text-brand-900 mt-0.5">
                {applyResult.overwrittenCount}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3 border border-emerald-100">
              <p className="text-brand-500">Skipped Sections</p>
              <p className="text-base font-bold text-brand-900 mt-0.5">
                {applyResult.skippedCount}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/attendance"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 underline hover:text-emerald-900"
            >
              <span>View updated sections in Daily Attendance</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useMemo } from 'react';
import studentService from '../../services/studentService';
import {
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  Building2,
  Layers,
  GraduationCap,
  Loader2,
  ChevronRight,
  ArrowLeft,
  FileText,
  RefreshCw,
} from 'lucide-react';

export default function StudentImportModal({
  isOpen,
  onClose,
  universities = [],
  sections = [],
  initialUniversity = '',
  initialSection = '',
  onImportSuccess,
}) {
  if (!isOpen) return null;

  // Step tracker (1: Target, 2: Upload, 3: Preview & Validate, 4: Confirm, 5: Result)
  const [step, setStep] = useState(1);

  // Form selections
  const [targetUniversity, setTargetUniversity] = useState(initialUniversity || universities[0]?._id || '');
  const [targetSection, setTargetSection] = useState(initialSection || sections[0]?._id || '');
  const [academicYear, setAcademicYear] = useState('2025-2026');

  // File state
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Preview & Validation state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

  // Filter sections by selected university
  const filteredSections = useMemo(() => {
    if (!targetUniversity) return sections;
    return sections.filter((s) => {
      const uId = s.university?._id || s.university;
      return String(uId) === String(targetUniversity);
    });
  }, [sections, targetUniversity]);

  // When university changes, update section if invalid
  const handleUniversityChange = (uId) => {
    setTargetUniversity(uId);
    const validSections = sections.filter((s) => {
      const parentId = s.university?._id || s.university;
      return String(parentId) === String(uId);
    });
    if (validSections.length > 0) {
      setTargetSection(validSections[0]._id);
    } else {
      setTargetSection('');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    const isExcel =
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls') ||
      selectedFile.type.includes('spreadsheet') ||
      selectedFile.type.includes('excel');

    if (!isExcel) {
      setPreviewError('Please upload an Excel (.xlsx or .xls) file.');
      return;
    }

    setFile(selectedFile);
    setPreviewError('');
    // Automatically trigger preview
    loadPreview(selectedFile);
  };

  const loadPreview = async (fileToPreview) => {
    try {
      setPreviewLoading(true);
      setPreviewError('');
      const fd = new FormData();
      fd.append('file', fileToPreview);
      fd.append('university', targetUniversity);
      fd.append('section', targetSection);
      fd.append('academicYear', academicYear);

      const res = await studentService.previewStudentsExcel(fd);
      setPreviewData(res);
      setStep(3); // Move to Preview & Validation step
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Failed to inspect Excel file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !targetUniversity || !targetSection) return;

    try {
      setImporting(true);
      setImportError('');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('university', targetUniversity);
      fd.append('section', targetSection);
      fd.append('academicYear', academicYear);

      const res = await studentService.importStudentsExcel(fd);
      setImportResult(res);
      setStep(5); // Move to Result step
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setImportError(err.response?.data?.message || 'Failed to complete student import');
    } finally {
      setImporting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const selectedUnivName =
    universities.find((u) => u._id === targetUniversity)?.name || 'Selected University';
  const selectedSecName =
    sections.find((s) => s._id === targetSection)?.name || 'Selected Section';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Import Students from Excel
              </h2>
              <p className="text-xs text-slate-500">
                6-step guided student enrollment & validation flow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="border-b border-slate-100 bg-white px-5 py-2.5 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max text-xs">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                step === 1
                  ? 'bg-brand-900 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              1. Target
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                step === 2
                  ? 'bg-brand-900 text-white'
                  : step > 2
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              2. Upload
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                step === 3
                  ? 'bg-brand-900 text-white'
                  : step > 3
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              3. Preview
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                step === 4
                  ? 'bg-brand-900 text-white'
                  : step > 4
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              4. Confirm
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                step === 5 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              5. Results
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 1: Select Target University, Section & Year */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                <h3 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-brand-700" />
                  <span>Step 1: Select Enrollment Target</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      University *
                    </label>
                    <select
                      value={targetUniversity}
                      onChange={(e) => handleUniversityChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                    >
                      {universities.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Section *
                    </label>
                    <select
                      value={targetSection}
                      onChange={(e) => setTargetSection(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                    >
                      {filteredSections.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Academic Year *
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="e.g. 2025-2026"
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 focus:border-brand-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">
                  Target Destination Summary:
                </span>
                <p>
                  Students will be enrolled into{' '}
                  <span className="font-semibold text-brand-900">{selectedSecName}</span> at{' '}
                  <span className="font-semibold text-brand-900">{selectedUnivName}</span> for{' '}
                  <span className="font-semibold text-brand-900">{academicYear}</span>.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: File Upload Zone */}
          {step === 2 && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-brand-600 bg-brand-50/60'
                    : 'border-slate-300 hover:border-brand-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="rounded-full bg-brand-50 p-3.5 text-brand-700 mb-3">
                  <Upload className="h-6 w-6" />
                </div>

                <div className="text-sm font-semibold text-slate-800">
                  Drag & drop your Excel file here, or browse
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Accepts standard Excel workbooks (.xlsx, .xls) up to 10MB
                </p>
              </div>

              {previewLoading && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-700 mb-2" />
                  <p className="text-xs font-medium text-slate-700">
                    Inspecting Excel sheet and validating student records...
                  </p>
                </div>
              )}

              {previewError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{previewError}</span>
                </div>
              )}

              {/* Template column info */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">Expected Column Headers:</span>
                <p className="text-[11px] text-slate-500">
                  Roll Number, Student Name, NIAT ID, Parent Name, Parent Phone, Student Phone
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Validation Breakdown */}
          {step === 3 && previewData && (
            <div className="space-y-4">
              {/* File details banner */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {previewData.fileName || file?.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatFileSize(previewData.fileSize || file?.size)} • {previewData.totalRows} records found
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreviewData(null);
                    setStep(2);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Change File
                </button>
              </div>

              {/* Validation Breakdown Cards (4 Cards — Emerald, Rose, Amber, Slate) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                  <div className="text-[11px] text-slate-500 font-medium">Total Rows</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {previewData.totalRows}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                  <div className="text-[11px] text-emerald-700 font-medium">Valid Ready</div>
                  <div className="text-lg font-bold text-emerald-800 mt-0.5">
                    {previewData.validCount}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <div className="text-[11px] text-amber-700 font-medium">Missing Data</div>
                  <div className="text-lg font-bold text-amber-800 mt-0.5">
                    {previewData.validationSummary?.missingFields || 0}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center">
                  <div className="text-[11px] text-rose-700 font-medium">Duplicates</div>
                  <div className="text-lg font-bold text-rose-800 mt-0.5">
                    {(previewData.validationSummary?.duplicateDb || 0) +
                      (previewData.validationSummary?.duplicateFile || 0)}
                  </div>
                </div>
              </div>

              {/* Preview Table (First 10 Rows) */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-slate-800">
                    Data Preview (First {previewData.previewRows?.length || 0} rows)
                  </span>
                  <span className="text-slate-500">
                    Target: {selectedSecName}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Row</th>
                        <th className="py-2 px-3 font-semibold">Roll No</th>
                        <th className="py-2 px-3 font-semibold">Name</th>
                        <th className="py-2 px-3 font-semibold">NIAT ID</th>
                        <th className="py-2 px-3 font-semibold">Parent Contact</th>
                        <th className="py-2 px-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.previewRows?.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/40'}
                        >
                          <td className="py-2 px-3 text-slate-500">#{row.rowNumber}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {row.rollNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-900">{row.name}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                            {row.niatId}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {row.parentPhone || '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" /> Valid
                              </span>
                            ) : (
                              <span
                                title={row.issue}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800"
                              >
                                <AlertCircle className="h-3 w-3" /> {row.issue}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Errors Breakdown (if any) */}
              {previewData.errors?.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-900 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>
                      {previewData.errors.length} issue(s) detected — these rows will be skipped:
                    </span>
                  </div>
                  <ul className="max-h-24 overflow-y-auto space-y-1 text-[11px] pl-5 list-disc text-rose-700">
                    {previewData.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        Row {err.row} ({err.rollNumber || 'No Roll'}): {err.reason}
                      </li>
                    ))}
                    {previewData.errors.length > 10 && (
                      <li className="font-medium">
                        ...and {previewData.errors.length - 10} more rows
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Confirmation Action */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <FileCheck className="h-6 w-6" />
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  Confirm Student Import
                </h3>

                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  You are about to import{' '}
                  <span className="font-bold text-emerald-700">
                    {previewData?.validCount || 0} valid students
                  </span>{' '}
                  into <span className="font-bold text-slate-900">{selectedSecName}</span> (
                  {selectedUnivName}).
                </p>

                {previewData?.invalidCount > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                    Note: {previewData.invalidCount} invalid or duplicate rows will be skipped.
                  </div>
                )}
              </div>

              {importError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Final Result Summary */}
          {step === 5 && importResult && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <CheckCircle2 className="h-6 w-6" />
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  Import Completed Successfully
                </h3>

                <p className="text-xs text-slate-600">
                  {importResult.message ||
                    `${importResult.importedCount} student(s) imported successfully.`}
                </p>
              </div>

              {/* Breakdown metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-white p-3.5 text-center">
                  <div className="text-xs text-emerald-700 font-medium">Successfully Imported</div>
                  <div className="text-2xl font-bold text-emerald-800 mt-1">
                    {importResult.importedCount}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-center">
                  <div className="text-xs text-slate-500 font-medium">Skipped / Duplicates</div>
                  <div className="text-2xl font-bold text-slate-700 mt-1">
                    {importResult.skippedCount}
                  </div>
                </div>
              </div>

              {importResult.skippedCount > 0 && importResult.errors?.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                  <div className="font-semibold text-amber-800 mb-1">
                    Skipped Rows Log:
                  </div>
                  <ul className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] pl-4 list-disc text-amber-800">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>
                        Row {err.row}: {err.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (min-h-[44px] touch-friendly action buttons) */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          {step > 1 && step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition"
              >
                Cancel
              </button>
            ) : null}

            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!targetUniversity || !targetSection}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 active:scale-98 transition disabled:opacity-50"
              >
                <span>Continue to Upload</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {step === 2 && file && (
              <button
                type="button"
                onClick={() => loadPreview(file)}
                disabled={previewLoading}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 active:scale-98 transition disabled:opacity-50"
              >
                {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Inspect & Preview</span>
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!previewData || previewData.validCount === 0}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-brand-900 px-5 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 active:scale-98 transition disabled:opacity-50"
              >
                <span>Proceed to Confirmation</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || !previewData || previewData.validCount === 0}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
              >
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {importing
                    ? 'Importing...'
                    : `Confirm & Import ${previewData?.validCount || 0} Students`}
                </span>
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center rounded-lg bg-brand-900 px-6 text-xs font-semibold text-white shadow-xs hover:bg-brand-800 active:scale-98 transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  MoreVertical,
  Calendar,
  Briefcase,
  Edit2,
  Clock,
  RotateCcw,
  ExternalLink,
  History,
  Phone,
  User,
  ChevronDown,
} from 'lucide-react';

/**
 * MobileStudentCard Component — Minimal Mobile-First UI
 *
 * DEFAULT COLLAPSED CARD:
 * - Top Row: Student Name | Three-dot menu | Expand arrow
 * - Second Row: Roll Number
 * - Bottom Row: [ Present ] [ Absent ]
 * - Padding: 12–14px internal padding
 *
 * EXPANDED CARD (On Chevron Click):
 * - Smoothly reveals NIAT ID, Student Phone, Parent info, Attendance %,
 *   Current Status badge, and optional attendance note.
 *
 * PRESERVED FEATURES:
 * - Swipe right for Present, swipe left for Absent (with vertical scroll protection)
 * - Three-dot menu with portal dropdown on desktop & bottom sheet on mobile
 *   (supports Late, Leave, On Duty, View Attendance, Reset to Pending, Audit Correction)
 */
const MobileStudentCard = memo(function MobileStudentCard({
  student,
  status = 'pending',
  remarks = '',
  canEdit = true,
  isSubmitted = false,
  isPendingGroup = false,
  onStatusChange,
  onRemarksChange,
  onOpenCorrection,
  onSwipeSuccess,
}) {
  const navigate = useNavigate();
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmationFeedback, setConfirmationFeedback] = useState(null);
  const [portalPos, setPortalPos] = useState({ top: 0, left: 0, openUpward: false });

  const touchStartRef = useRef({ x: 0, y: 0 });
  const isSwipingRef = useRef(false);
  const menuButtonRef = useRef(null);

  // Position calculation for Desktop Portal Dropdown
  const updatePortalPosition = () => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const dropdownHeight = 250;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      const top = openUpward ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4;
      const left = Math.min(
        Math.max(8, rect.right - 220),
        window.innerWidth - 230
      );
      setPortalPos({ top, left, openUpward });
    }
  };

  const handleToggleMenu = (e) => {
    e.stopPropagation();
    if (!menuOpen) {
      updatePortalPosition();
    }
    setMenuOpen(!menuOpen);
  };

  // Close desktop dropdown on outside click, Escape key, or window scroll/resize
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event) {
      // Only active on desktop (>= 640px) — mobile uses its own modal backdrop
      if (window.innerWidth < 640) return;

      if (
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target) &&
        !event.target.closest?.('[data-portal-menu]')
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    function handleScrollOrResize() {
      // Close dropdown if page is scrolled on desktop
      if (window.innerWidth >= 640) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [menuOpen]);

  // Lock body scroll when mobile bottom sheet is open
  useEffect(() => {
    if (menuOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Trigger status change with smooth confirmation feedback
  const triggerStatusChange = (newStatus, isSwipe = false) => {
    if (!canEdit) return;

    const feedbackMap = {
      present: { label: 'Marked Present', color: 'bg-[#16A34A] text-white' },
      absent: { label: 'Marked Absent', color: 'bg-[#DC2626] text-white' },
      late: { label: 'Marked Late', color: 'bg-amber-600 text-white' },
      leave: { label: 'Marked Leave', color: 'bg-purple-600 text-white' },
      on_duty: { label: 'Marked On Duty', color: 'bg-teal-700 text-white' },
      pending: { label: 'Reset to Pending', color: 'bg-slate-700 text-white' },
    };

    setConfirmationFeedback(feedbackMap[newStatus] || null);

    // Call status change handler
    onStatusChange(student._id, newStatus);

    if (isSwipe && typeof onSwipeSuccess === 'function') {
      onSwipeSuccess();
    }

    // Clear feedback confirmation after transition
    setTimeout(() => {
      setConfirmationFeedback(null);
    }, 450);
  };

  // Touch Handlers with Vertical Scroll Protection
  const handleTouchStart = (e) => {
    if (!canEdit) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isSwipingRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!canEdit) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    const deltaY = e.touches[0].clientY - touchStartRef.current.y;

    if (!isSwipingRef.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical scroll dominant — browser scrolls naturally
        return;
      }
      if (Math.abs(deltaX) > 10) {
        isSwipingRef.current = true;
      }
    }

    if (isSwipingRef.current) {
      // Horizontal swipe detected — clamp offset
      const clamped = Math.max(-95, Math.min(95, deltaX));
      setOffsetX(clamped);
    }
  };

  const handleTouchEnd = () => {
    if (!canEdit) return;
    setIsDragging(false);

    if (isSwipingRef.current) {
      if (offsetX > 45) {
        // Swiped Right -> Mark Present
        triggerStatusChange('present', true);
      } else if (offsetX < -45) {
        // Swiped Left -> Mark Absent
        triggerStatusChange('absent', true);
      }
    }

    setOffsetX(0);
    isSwipingRef.current = false;
  };

  // Status configuration — Classic Academic Navy & Amber Theme
  const statusConfig = {
    present: {
      label: 'Present',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    absent: {
      label: 'Absent',
      badgeClass: 'bg-red-50 text-red-800 border-red-200',
    },
    late: {
      label: 'Late',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    },
    leave: {
      label: 'Leave',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    },
    on_duty: {
      label: 'On Duty',
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    pending: {
      label: 'Pending',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    },
  };

  const currentCfg = statusConfig[status] || statusConfig.pending;
  const attendancePct = student.attendancePercentage;

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs select-none transition-all duration-250 ease-out animate-card-enter">
        {/* Background Swipe Cue: Green on Right Swipe (Present), Red on Left Swipe (Absent) */}
        <div className="absolute inset-0 flex items-center justify-between px-6 font-medium text-xs pointer-events-none">
          {/* Right Swipe Cue (Present) */}
          <div
            className={`flex items-center gap-2 transition-opacity duration-150 ${
              offsetX > 20 ? 'opacity-100 text-emerald-800' : 'opacity-0'
            }`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-xs">
              <Check className="h-4 w-4 stroke-[2.5]" />
            </div>
            <span className="font-semibold text-sm">Mark Present</span>
          </div>

          {/* Left Swipe Cue (Absent) */}
          <div
            className={`flex items-center gap-2 transition-opacity duration-150 ${
              offsetX < -20 ? 'opacity-100 text-red-800' : 'opacity-0'
            }`}
          >
            <span className="font-semibold text-sm">Mark Absent</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DC2626] text-white shadow-xs">
              <X className="h-4 w-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Foreground Card Surface (12–14px compact padding: p-3 sm:p-3.5) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          className="relative bg-white p-3 sm:p-3.5 border-slate-200 touch-pan-y"
        >
          {/* Transient Status Confirmation Overlay */}
          {confirmationFeedback && (
            <div
              className={`absolute inset-0 z-30 flex items-center justify-center rounded-xl font-semibold text-sm shadow-md transition-opacity duration-200 ${confirmationFeedback.color}`}
            >
              <span>{confirmationFeedback.label}</span>
            </div>
          )}

          {/* 1. TOP ROW: Student Name | Three-dot menu | Expand arrow */}
          <div className="flex items-center justify-between gap-2">
            <Link
              to={`/students/${student._id}/attendance`}
              className="text-[16px] font-semibold text-slate-900 hover:text-brand-700 active:text-brand-800 transition-colors truncate"
              title="View student attendance"
            >
              {student.name}
            </Link>

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Three-Dot Menu Button */}
              <button
                ref={menuButtonRef}
                type="button"
                onClick={handleToggleMenu}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer transition-colors"
                title="More attendance options"
                aria-label="More attendance options"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* Expand / Collapse Chevron */}
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                title={expanded ? 'Collapse details' : 'Expand student details'}
                aria-label={expanded ? 'Collapse details' : 'Expand student details'}
                aria-expanded={expanded}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    expanded ? 'rotate-180 text-brand-700' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 2. SECOND ROW: Roll Number & Status Indicator */}
          <div className="flex items-center justify-between text-[13px] font-normal text-slate-500 font-mono mt-0.5">
            <div>
              Roll: <span className="text-slate-800 font-medium">{student.rollNumber}</span>
            </div>
            {status !== 'pending' && status !== 'present' && status !== 'absent' && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${currentCfg.badgeClass}`}
              >
                {status === 'late' && <Clock className="h-3 w-3 text-amber-600" />}
                {status === 'leave' && <Calendar className="h-3 w-3 text-purple-600" />}
                {status === 'on_duty' && <Briefcase className="h-3 w-3 text-teal-600" />}
                <span>{currentCfg.label}</span>
              </span>
            )}
          </div>

          {/* 3. BOTTOM ROW: [ Present ] [ Absent ] */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-2.5">
            {/* Present Button (#16A34A) */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => triggerStatusChange('present')}
              className={`min-h-[40px] sm:min-h-[42px] px-3 rounded-xl text-[14px] sm:text-[15px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                status === 'present'
                  ? 'bg-[#16A34A] text-white shadow-xs border border-[#16A34A]'
                  : 'border border-emerald-300 text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 active:bg-emerald-200'
              }`}
              title="Mark Present"
              aria-label="Mark Present"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Present</span>
            </button>

            {/* Absent Button (#DC2626) */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => triggerStatusChange('absent')}
              className={`min-h-[40px] sm:min-h-[42px] px-3 rounded-xl text-[14px] sm:text-[15px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none ${
                status === 'absent'
                  ? 'bg-[#DC2626] text-white shadow-xs border border-[#DC2626]'
                  : 'border border-red-300 text-red-800 bg-red-50/70 hover:bg-red-100 active:bg-red-200'
              }`}
              title="Mark Absent"
              aria-label="Mark Absent"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
              <span>Absent</span>
            </button>
          </div>

          {/* EXPANDED ACCORDION: NIAT ID, Phone, Attendance %, Status Badge, Optional Note */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 animate-fade-in text-xs">
              {/* Row 1: NIAT ID, Student Phone, Parent info */}
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 font-medium">NIAT ID:</span>{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {student.niatId || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Phone:</span>{' '}
                  {student.studentPhone ? (
                    <a
                      href={`tel:${student.studentPhone}`}
                      className="text-brand-700 hover:underline font-mono"
                    >
                      {student.studentPhone}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-mono">N/A</span>
                  )}
                </div>

                {student.parentName && (
                  <div className="col-span-2 text-slate-600">
                    <span className="text-slate-400 font-medium">Parent:</span>{' '}
                    <span className="text-slate-800 font-medium">{student.parentName}</span>
                    {student.parentPhone && (
                      <a
                        href={`tel:${student.parentPhone}`}
                        className="text-brand-700 hover:underline font-mono text-[11px] ml-1.5"
                      >
                        ({student.parentPhone})
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Row 2: Attendance Rate & Current Status Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Att. Rate:</span>
                  <Link
                    to={`/students/${student._id}/attendance`}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-0.5 text-xs text-slate-700 font-semibold"
                    title="View student attendance sheet"
                  >
                    <span
                      className={
                        (attendancePct ?? 100) >= 75
                          ? 'text-emerald-700'
                          : (attendancePct ?? 100) >= 65
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }
                    >
                      {attendancePct !== undefined ? `${attendancePct}%` : 'N/A'}
                    </span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </Link>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${currentCfg.badgeClass}`}
                  >
                    {status === 'pending' && <Clock className="h-3 w-3 text-slate-500" />}
                    {status === 'present' && <Check className="h-3 w-3 text-emerald-600 stroke-[2.5]" />}
                    {status === 'absent' && <X className="h-3 w-3 text-red-600 stroke-[2.5]" />}
                    {status === 'late' && <Clock className="h-3 w-3 text-amber-600" />}
                    {status === 'leave' && <Calendar className="h-3 w-3 text-purple-600" />}
                    {status === 'on_duty' && <Briefcase className="h-3 w-3 text-teal-600" />}
                    <span>{currentCfg.label}</span>
                  </span>
                </div>
              </div>

              {/* Row 3: Optional Attendance Note */}
              <div className="pt-1.5 border-t border-slate-50">
                <input
                  type="text"
                  disabled={!canEdit}
                  value={remarks || ''}
                  onChange={(e) => onRemarksChange(student._id, e.target.value)}
                  placeholder="Add optional note (e.g., late by 15 mins, medical reason)..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 px-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-700 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP FLOATING PORTAL DROPDOWN (Rendered to document.body, zero layout shift) */}
      {menuOpen &&
        typeof document !== 'undefined' &&
        window.innerWidth >= 640 &&
        createPortal(
          <div
            data-portal-menu="true"
            style={{
              position: 'fixed',
              top: `${portalPos.top}px`,
              left: `${portalPos.left}px`,
              zIndex: 9999,
            }}
            className="w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl transition-all select-none animate-fade-in"
            role="menu"
          >
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              Additional Statuses
            </div>

            {/* Mark Late */}
            <button
              type="button"
              onClick={() => {
                triggerStatusChange('late');
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors text-left cursor-pointer"
              role="menuitem"
            >
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Mark Late</span>
            </button>

            {/* Mark Leave */}
            <button
              type="button"
              onClick={() => {
                triggerStatusChange('leave');
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-purple-800 hover:bg-purple-50 transition-colors text-left cursor-pointer"
              role="menuitem"
            >
              <Calendar className="h-4 w-4 text-purple-600 shrink-0" />
              <span>Mark Leave</span>
            </button>

            {/* Mark On Duty */}
            <button
              type="button"
              onClick={() => {
                triggerStatusChange('on_duty');
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-teal-800 hover:bg-teal-50 transition-colors text-left cursor-pointer"
              role="menuitem"
            >
              <Briefcase className="h-4 w-4 text-teal-600 shrink-0" />
              <span>Mark On Duty</span>
            </button>

            <div className="my-1 border-t border-slate-100" />

            {/* View Student Attendance */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate(`/students/${student._id}/attendance`);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              role="menuitem"
            >
              <ExternalLink className="h-4 w-4 text-slate-500 shrink-0" />
              <span>View Student Attendance</span>
            </button>

            {/* View Attendance History */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate(`/students/${student._id}/attendance`);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              role="menuitem"
            >
              <History className="h-4 w-4 text-slate-500 shrink-0" />
              <span>View Attendance History</span>
            </button>

            {!isSubmitted && status !== 'pending' && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    triggerStatusChange('pending');
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors text-left cursor-pointer"
                  role="menuitem"
                >
                  <RotateCcw className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>Reset to Pending</span>
                </button>
              </>
            )}

            {isSubmitted && onOpenCorrection && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenCorrection(student._id);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors text-left cursor-pointer"
                  role="menuitem"
                >
                  <Edit2 className="h-4 w-4 text-brand-600 shrink-0" />
                  <span>Audit Correction</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}

      {/* MOBILE BOTTOM SHEET (Rendered to document.body via createPortal) */}
      {menuOpen &&
        typeof document !== 'undefined' &&
        window.innerWidth < 640 &&
        createPortal(
          <div
            data-portal-menu="true"
            className="fixed inset-0 z-50 flex flex-col justify-end"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet Surface */}
            <div
              data-portal-menu="true"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="relative z-50 w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-slide-up"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`mobile-menu-title-${student._id}`}
            >
              {/* Grab Bar */}
              <div className="mx-auto -mt-1 mb-3 h-1.5 w-12 rounded-full bg-slate-300" />

              {/* Header: Student phone number and identification details */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3
                    id={`mobile-menu-title-${student._id}`}
                    className="text-base font-semibold text-slate-900"
                  >
                    {student.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Roll: {student.rollNumber} • NIAT: {student.niatId}
                    {student.studentPhone ? ` • Phone: ${student.studentPhone}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Attendance Status Actions */}
              <div className="py-3 space-y-1">
                <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Attendance Status Options
                </p>

                {/* Mark Late */}
                <button
                  type="button"
                  onClick={() => {
                    triggerStatusChange('late');
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-50 active:bg-amber-100 transition-colors cursor-pointer text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Mark Late</div>
                    <div className="text-xs text-amber-700">Counts toward attendance rate</div>
                  </div>
                </button>

                {/* Mark Leave */}
                <button
                  type="button"
                  onClick={() => {
                    triggerStatusChange('leave');
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-purple-900 hover:bg-purple-50 active:bg-purple-100 transition-colors cursor-pointer text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Mark Leave</div>
                    <div className="text-xs text-purple-700">Approved leave absence</div>
                  </div>
                </button>

                {/* Mark On Duty */}
                <button
                  type="button"
                  onClick={() => {
                    triggerStatusChange('on_duty');
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-teal-900 hover:bg-teal-50 active:bg-teal-100 transition-colors cursor-pointer text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700 shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Mark On Duty (OD)</div>
                    <div className="text-xs text-teal-700">Official college representation / duty</div>
                  </div>
                </button>
              </div>

              {/* Student Navigation & History */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Student Attendance Profile
                </p>

                {/* View Student Attendance */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/students/${student._id}/attendance`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <ExternalLink className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>View Full Attendance Sheet</span>
                </button>

                {/* View Attendance History */}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/students/${student._id}/attendance`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                >
                  <History className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>View Attendance History</span>
                </button>

                {/* Reset to Pending (if unsubmitted) */}
                {!isSubmitted && status !== 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerStatusChange('pending');
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                  >
                    <RotateCcw className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Reset to Pending</span>
                  </button>
                )}

                {/* Audit Edit (if submitted) */}
                {isSubmitted && onOpenCorrection && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenCorrection(student._id);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer text-left"
                  >
                    <Edit2 className="h-4 w-4 text-brand-600 shrink-0" />
                    <span>Audit Correction</span>
                  </button>
                )}
              </div>

              {/* Close Action */}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="mt-4 w-full rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});

export default MobileStudentCard;

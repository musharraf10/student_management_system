const attendanceService = require('../services/attendanceService');
const AttendanceDay = require('../models/AttendanceDay');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const { normalizeDate, calculateAttendanceStats } = require('../utils/attendanceCalculator');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get attendance marking sheet / submitted sheet for a section and date
 * @route   GET /api/attendance/daily-sheet
 * @access  Private
 */
const getDailySheet = asyncHandler(async (req, res) => {
  const { sectionId, date } = req.query;

  if (!sectionId || !date) {
    res.status(400);
    throw new Error('Please provide sectionId and date');
  }

  // Coach access check
  if (req.user.role === 'coach') {
    const isAssigned = (req.user.assignedSections || []).some(
      (s) => s.toString() === sectionId
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied: You are not assigned to this section');
    }
  }

  const result = await attendanceService.getSectionDailySheet({
    sectionId,
    date,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Submit daily attendance for a section
 * @route   POST /api/attendance/submit
 * @access  Private
 */
const submitDailyAttendance = asyncHandler(async (req, res) => {
  const { sectionId, date, dayType, holidayReason, records } = req.body;

  if (!sectionId || !date || !dayType) {
    res.status(400);
    throw new Error('Please provide sectionId, date, and dayType');
  }

  // Coach access check & edit permissions
  if (req.user.role === 'coach') {
    const isAssigned = (req.user.assignedSections || []).some(
      (s) => s.toString() === sectionId
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied: You are not assigned to this section');
    }

    // If attendance already exists, verify editAttendance permission
    const normalizedDate = normalizeDate(date);
    const existingDay = await AttendanceDay.findOne({
      section: sectionId,
      date: normalizedDate,
    });
    if (existingDay && !req.user.permissions?.editAttendance) {
      res.status(403);
      throw new Error('Attendance is already submitted. You do not have permission to modify submitted attendance');
    }
  }

  const attendanceDay = await attendanceService.submitAttendance({
    sectionId,
    date,
    dayType,
    holidayReason,
    records,
    userId: req.user._id,
    userRole: req.user.role,
  });

  res.status(200).json({
    success: true,
    message: 'Attendance submitted successfully',
    data: attendanceDay,
  });
});

/**
 * @desc    Update single student attendance status with audit log
 * @route   PATCH /api/attendance/records/:id
 * @access  Private (Super Admin OR Coach with editAttendance)
 */
const updateStudentRecord = asyncHandler(async (req, res) => {
  const { newStatus, reason, remarks } = req.body;

  if (!newStatus) {
    res.status(400);
    throw new Error('newStatus is required');
  }

  // Coach permission check
  if (req.user.role === 'coach' && !req.user.permissions?.editAttendance) {
    res.status(403);
    throw new Error('You do not have permission to edit student attendance');
  }

  const updatedRecord = await attendanceService.updateSingleStudentAttendance({
    recordId: req.params.id,
    newStatus,
    reason,
    remarks,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Student attendance updated with audit trail',
    data: updatedRecord,
  });
});

/**
 * @desc    Get attendance audit history
 * @route   GET /api/attendance/audit-logs
 * @access  Private
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { sectionId, studentId, date, universityId, limit } = req.query;

  // Coach isolation
  let effectiveSectionId = sectionId;
  if (req.user.role === 'coach') {
    if (sectionId) {
      const isAssigned = (req.user.assignedSections || []).some(
        (s) => s.toString() === sectionId
      );
      if (!isAssigned) {
        res.status(403);
        throw new Error('Access denied to audit logs of this section');
      }
    }
  }

  const logs = await attendanceService.getAuditHistory({
    sectionId: effectiveSectionId,
    studentId,
    date,
    universityId,
    limit,
  });

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

/**
 * @desc    Get section attendance history (days list)
 * @route   GET /api/attendance/history
 * @access  Private
 */
const getSectionHistory = asyncHandler(async (req, res) => {
  const { sectionId, month, year } = req.query;

  if (!sectionId) {
    res.status(400);
    throw new Error('sectionId is required');
  }

  if (req.user.role === 'coach') {
    const isAssigned = (req.user.assignedSections || []).some(
      (s) => s.toString() === sectionId
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied to history of this section');
    }
  }

  let query = { section: sectionId };

  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    query.date = { $gte: startDate, $lte: endDate };
  }

  const history = await AttendanceDay.find(query)
    .populate('submittedBy', 'name email role')
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
});

/**
 * @desc    Get detailed individual student attendance history and summary
 * @route   GET /api/attendance/student/:id
 * @access  Private (Super Admin & assigned Coaches)
 */
const getStudentAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { month, year } = req.query;

  const student = await Student.findById(id)
    .populate('university', 'name code')
    .populate('section', 'name code academicYear semester');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Permission check for coach
  if (req.user.role === 'coach') {
    const isAssignedSection = (req.user.assignedSections || []).some(
      (s) => s.toString() === student.section?._id?.toString()
    );
    const isAssignedUni = (req.user.assignedUniversities || []).some(
      (u) => u.toString() === student.university?._id?.toString()
    );
    if (!isAssignedSection && !isAssignedUni) {
      res.status(403);
      throw new Error('Access denied: You are not assigned to this student section or university');
    }
  }

  // Query section attendance days
  let dayQuery = { section: student.section?._id };

  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    dayQuery.date = { $gte: startDate, $lte: endDate };
  } else if (year && !month) {
    const y = parseInt(year, 10);
    const startDate = new Date(Date.UTC(y, 0, 1));
    const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
    dayQuery.date = { $gte: startDate, $lte: endDate };
  }

  const attendanceDays = await AttendanceDay.find(dayQuery)
    .populate('submittedBy', 'name email role')
    .populate('lastModifiedBy', 'name email role')
    .sort({ date: -1 });

  const dayIds = attendanceDays.map((d) => d._id);

  // Query individual student attendance records
  const records = await AttendanceRecord.find({
    student: student._id,
    attendanceDay: { $in: dayIds },
  });

  const recordMap = {};
  records.forEach((r) => {
    recordMap[r.attendanceDay.toString()] = r;
  });

  // Calculate day-by-day history & counters
  let workingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let leaveDays = 0;
  let onDutyDays = 0;
  let holidays = 0;
  let sundays = 0;

  const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const history = attendanceDays.map((day) => {
    const d = new Date(day.date);
    const dayOfWeek = dayOfWeekNames[d.getUTCDay()];
    const rec = recordMap[day._id.toString()];

    let status = 'not_recorded';
    if (day.dayType === 'sunday') {
      status = 'sunday';
      sundays++;
    } else if (day.dayType === 'holiday') {
      status = 'holiday';
      holidays++;
    } else {
      // working_day or online_class
      workingDays++;
      if (rec) {
        status = rec.status;
        if (rec.status === 'present') presentDays++;
        else if (rec.status === 'absent') absentDays++;
        else if (rec.status === 'late') lateDays++;
        else if (rec.status === 'leave') leaveDays++;
        else if (rec.status === 'on_duty') onDutyDays++;
      } else {
        status = 'absent';
        absentDays++;
      }
    }

    return {
      _id: day._id,
      date: day.date,
      dayOfWeek,
      dayType: day.dayType,
      holidayReason: day.holidayReason || '',
      status,
      remarks: rec?.remarks || '',
      recordId: rec?._id || null,
      updatedBy: day.lastModifiedBy || day.submittedBy || null,
      updatedAt: rec?.updatedAt || day.updatedAt,
    };
  });

  // Centralized stats calculation
  const summary = calculateAttendanceStats({
    workingDays,
    presentDays,
    absentDays,
    lateDays,
    leaveDays,
    onDutyDays,
    holidays,
    sundays,
  });

  res.status(200).json({
    success: true,
    data: {
      student,
      summary: {
        ...summary,
        totalDays: attendanceDays.length,
      },
      history,
    },
  });
});

/**
 * @desc    Preview university calendar designation (check affected sections & conflicts)
 * @route   POST /api/attendance/university-calendar/preview
 * @access  Private (Super Admin)
 */
const previewUniversityCalendar = asyncHandler(async (req, res) => {
  const { universityId, date, dayType, holidayReason } = req.body;

  if (!universityId || !date || !dayType) {
    res.status(400);
    throw new Error('Please provide universityId, date, and dayType');
  }

  if (dayType !== 'holiday' && dayType !== 'sunday') {
    res.status(400);
    throw new Error('dayType must be either "holiday" or "sunday"');
  }

  // Super admin check
  if (req.user.role !== 'super_admin') {
    res.status(403);
    throw new Error('Only Super Admin / Zonal Manager can manage university-wide calendar');
  }

  const preview = await attendanceService.previewUniversityCalendar({
    universityId,
    date,
    dayType,
    holidayReason,
  });

  res.status(200).json({
    success: true,
    data: preview,
  });
});

/**
 * @desc    Apply university calendar designation (Holiday or Sunday) across all active sections
 * @route   POST /api/attendance/university-calendar/apply
 * @access  Private (Super Admin)
 */
const applyUniversityCalendar = asyncHandler(async (req, res) => {
  const { universityId, date, dayType, holidayReason, overwriteConflicts } = req.body;

  if (!universityId || !date || !dayType) {
    res.status(400);
    throw new Error('Please provide universityId, date, and dayType');
  }

  if (dayType !== 'holiday' && dayType !== 'sunday') {
    res.status(400);
    throw new Error('dayType must be either "holiday" or "sunday"');
  }

  if (req.user.role !== 'super_admin') {
    res.status(403);
    throw new Error('Only Super Admin / Zonal Manager can manage university-wide calendar');
  }

  const result = await attendanceService.applyUniversityCalendar({
    universityId,
    date,
    dayType,
    holidayReason,
    overwriteConflicts: Boolean(overwriteConflicts),
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: `University calendar applied to ${result.appliedCount} section(s)`,
    data: result,
  });
});

/**
 * @desc    Batch synchronize offline attendance records with MongoDB
 * @route   POST /api/attendance/sync-batch
 * @access  Private (Super Admin OR Coach)
 */
const syncAttendanceBatch = asyncHandler(async (req, res) => {
  const { batchId, records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(200).json({
      success: true,
      batchId: batchId || 'empty_batch',
      totalProcessed: 0,
      acknowledgedCount: 0,
      failedCount: 0,
      acknowledgedOpIds: [],
      failedRecords: [],
    });
  }

  const result = await attendanceService.syncAttendanceBatch({
    userId: req.user._id,
    userRole: req.user.role,
    assignedSections: req.user.assignedSections || [],
    records,
  });

  res.status(200).json({
    success: true,
    batchId: batchId || `batch_${Date.now()}`,
    ...result,
  });
});

module.exports = {
  getDailySheet,
  submitDailyAttendance,
  updateStudentRecord,
  getAuditLogs,
  getSectionHistory,
  getStudentAttendance,
  previewUniversityCalendar,
  applyUniversityCalendar,
  syncAttendanceBatch,
};

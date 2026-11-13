const reportService = require('../services/reportService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Download monthly section-wise attendance Excel report
 * @route   GET /api/reports/monthly
 * @access  Private (Super Admin OR Coach with exportReports)
 */
const downloadMonthlyReport = asyncHandler(async (req, res) => {
  const { sectionId, month, year } = req.query;

  if (!sectionId || !month || !year) {
    res.status(400);
    throw new Error('Please provide sectionId, month, and year');
  }

  // Coach access check
  if (req.user.role === 'coach') {
    if (!req.user.permissions?.exportReports) {
      res.status(403);
      throw new Error('You do not have permission to export reports');
    }
    const isAssigned = (req.user.assignedSections || []).some(
      (s) => s.toString() === sectionId
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied to report for this section');
    }
  }

  await reportService.generateMonthlySectionReport({
    sectionId,
    month,
    year,
    res,
  });
});

/**
 * @desc    Download university-wide attendance Excel report
 * @route   GET /api/reports/university
 * @access  Private (Super Admin OR Coach with exportReports)
 */
const downloadUniversityReport = asyncHandler(async (req, res) => {
  const { universityId, month, year } = req.query;

  if (!universityId || !month || !year) {
    res.status(400);
    throw new Error('Please provide universityId, month, and year');
  }

  if (req.user.role === 'coach') {
    if (!req.user.permissions?.exportReports) {
      res.status(403);
      throw new Error('You do not have permission to export reports');
    }
    const isAssigned = (req.user.assignedUniversities || []).some(
      (u) => u.toString() === universityId
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied to report for this university');
    }
  }

  await reportService.generateUniversityReport({
    universityId,
    month,
    year,
    res,
  });
});

/**
 * @desc    Download semester attendance Excel report
 * @route   GET /api/reports/semester
 * @access  Private (Super Admin OR Coach with exportReports)
 */
const downloadSemesterReport = asyncHandler(async (req, res) => {
  const { universityId, academicYear, startDate, endDate, sectionId } = req.query;

  if (!universityId || !academicYear || !startDate || !endDate) {
    res.status(400);
    throw new Error('Please provide universityId, academicYear, startDate, and endDate');
  }

  if (req.user.role === 'coach') {
    if (!req.user.permissions?.exportReports) {
      res.status(403);
      throw new Error('You do not have permission to export reports');
    }
    const isAssigned = (req.user.assignedUniversities || []).some(
      (u) => u.toString() === universityId
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied to report for this university');
    }
  }

  await reportService.generateSemesterReport({
    universityId,
    academicYear,
    startDate,
    endDate,
    sectionId,
    res,
  });
});

/**
 * @desc    Download individual student attendance Excel report
 * @route   GET /api/reports/student
 * @access  Private (Super Admin OR Coach with exportReports)
 */
const downloadStudentReport = asyncHandler(async (req, res) => {
  const { studentId, startDate, endDate, month, year } = req.query;

  if (!studentId) {
    res.status(400);
    throw new Error('Please provide studentId');
  }

  if (req.user.role === 'coach') {
    if (!req.user.permissions?.exportReports) {
      res.status(403);
      throw new Error('You do not have permission to export reports');
    }
  }

  await reportService.generateStudentReport({
    studentId,
    startDate,
    endDate,
    month,
    year,
    res,
  });
});

/**
 * @desc    Get live attendance report preview data & metrics
 * @route   GET /api/reports/preview
 * @access  Private (Super Admin OR Coach)
 */
const getReportPreview = asyncHandler(async (req, res) => {
  const {
    reportType,
    universityId,
    sectionId,
    studentId,
    academicYear,
    month,
    year,
    startDate,
    endDate,
  } = req.query;

  // Coach access checks
  if (req.user.role === 'coach') {
    if (sectionId) {
      const isAssigned = (req.user.assignedSections || []).some(
        (s) => s.toString() === sectionId
      );
      if (!isAssigned) {
        res.status(403);
        throw new Error('Access denied to report for this section');
      }
    } else if (universityId) {
      const isAssigned = (req.user.assignedUniversities || []).some(
        (u) => u.toString() === universityId
      );
      if (!isAssigned) {
        res.status(403);
        throw new Error('Access denied to report for this university');
      }
    }
  }

  const data = await reportService.getReportPreviewData({
    reportType,
    universityId,
    sectionId,
    studentId,
    academicYear,
    month,
    year,
    startDate,
    endDate,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  downloadMonthlyReport,
  downloadUniversityReport,
  downloadSemesterReport,
  downloadStudentReport,
  getReportPreview,
};

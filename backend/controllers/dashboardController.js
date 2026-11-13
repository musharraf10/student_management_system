const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get dashboard metrics (Role-aware for Super Admin or Success Coach)
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  let data;

  if (req.user.role === 'super_admin') {
    data = await dashboardService.getSuperAdminMetrics(req.query);
  } else {
    data = await dashboardService.getCoachMetrics(req.user, req.query);
  }

  res.status(200).json({
    success: true,
    role: req.user.role,
    data,
  });
});

/**
 * @desc    Get detailed university-specific dashboard metrics
 * @route   GET /api/dashboard/university/:id
 * @access  Private (Super Admin OR assigned Coach)
 */
const getUniversityDashboard = asyncHandler(async (req, res) => {
  // Coach data isolation
  if (req.user.role === 'coach') {
    const isAssigned = (req.user.assignedUniversities || []).some(
      (u) => u.toString() === req.params.id
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied: You are not assigned to this university');
    }
  }

  const data = await dashboardService.getUniversityDetailDashboard(
    req.params.id,
    req.query
  );

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getDashboardStats,
  getUniversityDashboard,
};

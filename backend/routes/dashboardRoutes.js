const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUniversityDashboard,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/university/:id', protect, getUniversityDashboard);

module.exports = router;

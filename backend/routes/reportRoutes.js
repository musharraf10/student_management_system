const express = require('express');
const router = express.Router();
const {
  downloadMonthlyReport,
  downloadUniversityReport,
  downloadSemesterReport,
  downloadStudentReport,
  getReportPreview,
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/preview', protect, getReportPreview);
router.get('/monthly', protect, downloadMonthlyReport);
router.get('/university', protect, downloadUniversityReport);
router.get('/semester', protect, downloadSemesterReport);
router.get('/student', protect, downloadStudentReport);

module.exports = router;

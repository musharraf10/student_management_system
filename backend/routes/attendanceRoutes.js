const express = require('express');
const router = express.Router();
const {
  getDailySheet,
  submitDailyAttendance,
  updateStudentRecord,
  getAuditLogs,
  getSectionHistory,
  getStudentAttendance,
  previewUniversityCalendar,
  applyUniversityCalendar,
  syncAttendanceBatch,
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.get('/daily-sheet', protect, getDailySheet);
router.post('/submit', protect, submitDailyAttendance);
router.post('/sync-batch', protect, syncAttendanceBatch);
router.patch('/records/:id', protect, updateStudentRecord);
router.get('/audit-logs', protect, getAuditLogs);
router.get('/history', protect, getSectionHistory);
router.get('/student/:id', protect, getStudentAttendance);
router.post('/university-calendar/preview', protect, previewUniversityCalendar);
router.post('/university-calendar/apply', protect, applyUniversityCalendar);

module.exports = router;

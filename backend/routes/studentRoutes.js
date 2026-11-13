const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  transferStudent,
  importStudentsExcel,
  previewStudentsExcel,
  exportStudentsExcel,
} = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer memory storage for secure in-memory Excel file handling
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.includes('spreadsheetml') ||
      file.mimetype.includes('excel') ||
      file.originalname.match(/\.(xlsx|xls)$/)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) files are accepted'), false);
    }
  },
});

router.route('/').get(protect, getStudents).post(protect, createStudent);

router.get('/export-excel', protect, exportStudentsExcel);
router.post('/preview-excel', protect, upload.single('file'), previewStudentsExcel);
router.post('/import-excel', protect, upload.single('file'), importStudentsExcel);

router.route('/:id').get(protect, getStudentById).put(protect, updateStudent);
router.patch('/:id/transfer', protect, transferStudent);

module.exports = router;

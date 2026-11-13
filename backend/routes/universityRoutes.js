const express = require('express');
const router = express.Router();
const {
  getUniversities,
  getUniversityById,
  createUniversity,
  updateUniversity,
} = require('../controllers/universityController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

router
  .route('/')
  .get(protect, getUniversities)
  .post(protect, superAdminOnly, createUniversity);

router
  .route('/:id')
  .get(protect, getUniversityById)
  .put(protect, superAdminOnly, updateUniversity);

module.exports = router;

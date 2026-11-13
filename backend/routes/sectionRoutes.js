const express = require('express');
const router = express.Router();
const {
  getSections,
  getSectionById,
  createSection,
  updateSection,
} = require('../controllers/sectionController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

router
  .route('/')
  .get(protect, getSections)
  .post(protect, superAdminOnly, createSection);

router
  .route('/:id')
  .get(protect, getSectionById)
  .put(protect, superAdminOnly, updateSection);

module.exports = router;

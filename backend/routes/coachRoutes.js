const express = require('express');
const router = express.Router();
const {
  getCoaches,
  getCoachById,
  createCoach,
  updateCoach,
  updateCoachPermissions,
} = require('../controllers/coachController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/roleMiddleware');

router
  .route('/')
  .get(protect, superAdminOnly, getCoaches)
  .post(protect, superAdminOnly, createCoach);

router
  .route('/:id')
  .get(protect, superAdminOnly, getCoachById)
  .put(protect, superAdminOnly, updateCoach);

router.patch('/:id/permissions', protect, superAdminOnly, updateCoachPermissions);

module.exports = router;

const express = require('express');
const router = express.Router();
const { login, getMe, setupInitialAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/setup-admin', setupInitialAdmin);

module.exports = router;

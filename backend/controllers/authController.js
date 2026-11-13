const mongoose = require('mongoose');
const User = require('../models/User');
const University = require('../models/University');
const Section = require('../models/Section');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Find user and include password for verification
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (user.status === 'inactive') {
    res.status(403);
    throw new Error('Account has been deactivated. Please contact your administrator');
  }

  const token = generateToken(user._id, user.role);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      assignedUniversities: user.assignedUniversities,
      assignedSections: user.assignedSections,
      status: user.status,
    },
  });
});

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  let query = User.findById(req.user._id);

  if (mongoose.models.University) {
    query = query.populate('assignedUniversities', 'name code location status');
  }
  if (mongoose.models.Section) {
    query = query.populate('assignedSections', 'name code academicYear semester status');
  }

  const user = await query;

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      assignedUniversities: user.assignedUniversities,
      assignedSections: user.assignedSections,
      status: user.status,
    },
  });
});

/**
 * @desc    Setup initial Zonal Manager (Super Admin) if no super admin exists
 * @route   POST /api/auth/setup-admin
 * @access  Public (Only works if 0 super_admin exists in database)
 */
const setupInitialAdmin = asyncHandler(async (req, res) => {
  const existingAdmin = await User.findOne({ role: 'super_admin' });
  if (existingAdmin) {
    res.status(400);
    throw new Error('Super Admin account already exists. Use the login screen');
  }

  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required for initial admin setup');
  }

  const admin = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: phone || '',
    role: 'super_admin',
    status: 'active',
    permissions: {
      addStudents: true,
      editStudents: true,
      editAttendance: true,
      exportReports: true,
    },
  });

  const token = generateToken(admin._id, admin.role);

  res.status(201).json({
    success: true,
    message: 'Initial Super Admin created successfully',
    token,
    user: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      permissions: admin.permissions,
    },
  });
});

module.exports = {
  login,
  getMe,
  setupInitialAdmin,
};

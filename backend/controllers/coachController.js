const User = require('../models/User');
const Section = require('../models/Section');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all Success Coaches
 * @route   GET /api/coaches
 * @access  Private (Super Admin only)
 */
const getCoaches = asyncHandler(async (req, res) => {
  const query = { role: 'coach' };

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
  }

  const coaches = await User.find(query)
    .populate('assignedUniversities', 'name code location status')
    .populate('assignedSections', 'name code academicYear semester status')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: coaches.length,
    data: coaches,
  });
});

/**
 * @desc    Get single coach by ID
 * @route   GET /api/coaches/:id
 * @access  Private (Super Admin only)
 */
const getCoachById = asyncHandler(async (req, res) => {
  const coach = await User.findOne({ _id: req.params.id, role: 'coach' })
    .populate('assignedUniversities', 'name code location status')
    .populate('assignedSections', 'name code academicYear semester status');

  if (!coach) {
    res.status(404);
    throw new Error('Success Coach not found');
  }

  res.status(200).json({
    success: true,
    data: coach,
  });
});

/**
 * @desc    Create new Success Coach
 * @route   POST /api/coaches
 * @access  Private (Super Admin only)
 */
const createCoach = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    assignedUniversities = [],
    assignedSections = [],
    permissions = {},
  } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  const coach = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: phone ? phone.trim() : '',
    role: 'coach',
    status: 'active',
    assignedUniversities,
    assignedSections,
    permissions: {
      addStudents: !!permissions.addStudents,
      editStudents: !!permissions.editStudents,
      editAttendance: !!permissions.editAttendance,
      exportReports: !!permissions.exportReports,
    },
  });

  // Synchronize section assignedCoaches array
  if (assignedSections.length > 0) {
    await Section.updateMany(
      { _id: { $in: assignedSections } },
      { $addToSet: { assignedCoaches: coach._id } }
    );
  }

  const populatedCoach = await User.findById(coach._id)
    .populate('assignedUniversities', 'name code')
    .populate('assignedSections', 'name code');

  res.status(201).json({
    success: true,
    message: 'Success Coach created successfully',
    data: populatedCoach,
  });
});

/**
 * @desc    Update Success Coach profile & assignments
 * @route   PUT /api/coaches/:id
 * @access  Private (Super Admin only)
 */
const updateCoach = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    status,
    assignedUniversities,
    assignedSections,
    permissions,
  } = req.body;

  const coach = await User.findOne({ _id: req.params.id, role: 'coach' });
  if (!coach) {
    res.status(404);
    throw new Error('Success Coach not found');
  }

  if (email && email.toLowerCase().trim() !== coach.email) {
    const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      res.status(400);
      throw new Error('Email is already registered to another user');
    }
    coach.email = email.toLowerCase().trim();
  }

  if (name) coach.name = name.trim();
  if (phone !== undefined) coach.phone = phone.trim();
  if (status) coach.status = status;
  if (password) coach.password = password; // Will be hashed by pre-save hook

  if (permissions) {
    coach.permissions = {
      addStudents: permissions.addStudents !== undefined ? !!permissions.addStudents : coach.permissions.addStudents,
      editStudents: permissions.editStudents !== undefined ? !!permissions.editStudents : coach.permissions.editStudents,
      editAttendance: permissions.editAttendance !== undefined ? !!permissions.editAttendance : coach.permissions.editAttendance,
      exportReports: permissions.exportReports !== undefined ? !!permissions.exportReports : coach.permissions.exportReports,
    };
  }

  if (Array.isArray(assignedUniversities)) {
    coach.assignedUniversities = assignedUniversities;
  }

  // Handle section assignment synchronization
  if (Array.isArray(assignedSections)) {
    const previousSections = (coach.assignedSections || []).map((s) => s.toString());
    const newSections = assignedSections.map((s) => s.toString());

    // Removed from sections
    const removedSections = previousSections.filter((s) => !newSections.includes(s));
    if (removedSections.length > 0) {
      await Section.updateMany(
        { _id: { $in: removedSections } },
        { $pull: { assignedCoaches: coach._id } }
      );
    }

    // Added to sections
    const addedSections = newSections.filter((s) => !previousSections.includes(s));
    if (addedSections.length > 0) {
      await Section.updateMany(
        { _id: { $in: addedSections } },
        { $addToSet: { assignedCoaches: coach._id } }
      );
    }

    coach.assignedSections = assignedSections;
  }

  await coach.save();

  const updatedCoach = await User.findById(coach._id)
    .populate('assignedUniversities', 'name code')
    .populate('assignedSections', 'name code');

  res.status(200).json({
    success: true,
    message: 'Success Coach updated successfully',
    data: updatedCoach,
  });
});

/**
 * @desc    Update only permissions for a coach
 * @route   PATCH /api/coaches/:id/permissions
 * @access  Private (Super Admin only)
 */
const updateCoachPermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!permissions) {
    res.status(400);
    throw new Error('Permissions object is required');
  }

  const coach = await User.findOne({ _id: req.params.id, role: 'coach' });
  if (!coach) {
    res.status(404);
    throw new Error('Success Coach not found');
  }

  coach.permissions = {
    addStudents: permissions.addStudents !== undefined ? !!permissions.addStudents : coach.permissions.addStudents,
    editStudents: permissions.editStudents !== undefined ? !!permissions.editStudents : coach.permissions.editStudents,
    editAttendance: permissions.editAttendance !== undefined ? !!permissions.editAttendance : coach.permissions.editAttendance,
    exportReports: permissions.exportReports !== undefined ? !!permissions.exportReports : coach.permissions.exportReports,
  };

  await coach.save();

  res.status(200).json({
    success: true,
    message: 'Permissions updated successfully',
    data: coach.permissions,
  });
});

module.exports = {
  getCoaches,
  getCoachById,
  createCoach,
  updateCoach,
  updateCoachPermissions,
};

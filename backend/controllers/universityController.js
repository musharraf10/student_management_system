const University = require('../models/University');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all universities (Role-isolated)
 * @route   GET /api/universities
 * @access  Private (Super Admin gets all; Coach gets assigned only)
 */
const getUniversities = asyncHandler(async (req, res) => {
  let query = {};

  // Success Coach can only access their assigned universities
  if (req.user.role === 'coach') {
    query._id = { $in: req.user.assignedUniversities || [] };
  }

  // Filter by status if query param provided
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Search by name or code
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    query.$or = [{ name: searchRegex }, { code: searchRegex }, { location: searchRegex }];
  }

  const universities = await University.find(query).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: universities.length,
    data: universities,
  });
});

/**
 * @desc    Get single university by ID
 * @route   GET /api/universities/:id
 * @access  Private
 */
const getUniversityById = asyncHandler(async (req, res) => {
  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  // Validate Success Coach data isolation
  if (req.user.role === 'coach') {
    const isAssigned = (req.user.assignedUniversities || []).some(
      (uId) => uId.toString() === university._id.toString()
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied: You are not assigned to this university');
    }
  }

  res.status(200).json({
    success: true,
    data: university,
  });
});

/**
 * @desc    Create new university
 * @route   POST /api/universities
 * @access  Private (Super Admin only)
 */
const createUniversity = asyncHandler(async (req, res) => {
  const { name, code, location, status } = req.body;

  if (!name || !code || !location) {
    res.status(400);
    throw new Error('Please provide name, code, and location for the university');
  }

  const existingCode = await University.findOne({ code: code.toUpperCase().trim() });
  if (existingCode) {
    res.status(400);
    throw new Error(`A university with code '${code.toUpperCase().trim()}' already exists`);
  }

  const university = await University.create({
    name: name.trim(),
    code: code.toUpperCase().trim(),
    location: location.trim(),
    status: status || 'active',
  });

  res.status(201).json({
    success: true,
    message: 'University created successfully',
    data: university,
  });
});

/**
 * @desc    Update university
 * @route   PUT /api/universities/:id
 * @access  Private (Super Admin only)
 */
const updateUniversity = asyncHandler(async (req, res) => {
  const { name, code, location, status } = req.body;

  const university = await University.findById(req.params.id);
  if (!university) {
    res.status(404);
    throw new Error('University not found');
  }

  // Check code uniqueness if code is being changed
  if (code && code.toUpperCase().trim() !== university.code) {
    const codeExists = await University.findOne({ code: code.toUpperCase().trim() });
    if (codeExists) {
      res.status(400);
      throw new Error(`University code '${code.toUpperCase().trim()}' is already in use`);
    }
    university.code = code.toUpperCase().trim();
  }

  if (name) university.name = name.trim();
  if (location) university.location = location.trim();
  if (status) university.status = status;

  const updatedUniversity = await university.save();

  res.status(200).json({
    success: true,
    message: 'University updated successfully',
    data: updatedUniversity,
  });
});

module.exports = {
  getUniversities,
  getUniversityById,
  createUniversity,
  updateUniversity,
};

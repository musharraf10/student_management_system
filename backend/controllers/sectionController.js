const Section = require('../models/Section');
const University = require('../models/University');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all sections (Role-isolated)
 * @route   GET /api/sections
 * @access  Private (Super Admin gets all or filtered; Coach gets assigned only)
 */
const getSections = asyncHandler(async (req, res) => {
  let query = {};

  // Success Coach data isolation
  if (req.user.role === 'coach') {
    query._id = { $in: req.user.assignedSections || [] };
  }

  // Filter by university
  if (req.query.university) {
    // If coach, make sure they have access to this university
    if (
      req.user.role === 'coach' &&
      !(req.user.assignedUniversities || []).some(
        (u) => u.toString() === req.query.university
      )
    ) {
      res.status(403);
      throw new Error('Access denied to sections of this university');
    }
    query.university = req.query.university;
  }

  // Filter by academic year
  if (req.query.academicYear) {
    query.academicYear = req.query.academicYear;
  }

  // Filter by semester
  if (req.query.semester) {
    query.semester = req.query.semester;
  }

  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }

  // Search by section name or code
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    query.$or = [{ name: searchRegex }, { code: searchRegex }];
  }

  const sections = await Section.find(query)
    .populate('university', 'name code location status')
    .populate('assignedCoaches', 'name email phone status')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: sections.length,
    data: sections,
  });
});

/**
 * @desc    Get single section by ID
 * @route   GET /api/sections/:id
 * @access  Private
 */
const getSectionById = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id)
    .populate('university', 'name code location status')
    .populate('assignedCoaches', 'name email phone status');

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  // Validate Success Coach data isolation
  if (req.user.role === 'coach') {
    const isAssigned = (req.user.assignedSections || []).some(
      (sId) => sId.toString() === section._id.toString()
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('Access denied: You are not assigned to this section');
    }
  }

  res.status(200).json({
    success: true,
    data: section,
  });
});

/**
 * @desc    Create section
 * @route   POST /api/sections
 * @access  Private (Super Admin only)
 */
const createSection = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    university,
    academicYear,
    semester,
    assignedCoaches = [],
    status,
  } = req.body;

  if (!name || !code || !university || !academicYear || !semester) {
    res.status(400);
    throw new Error('Please provide name, code, university, academicYear, and semester');
  }

  // Validate university exists
  const existingUniversity = await University.findById(university);
  if (!existingUniversity) {
    res.status(404);
    throw new Error('Assigned university does not exist');
  }

  // Check section name duplicate in the same university and academic year
  const duplicate = await Section.findOne({
    university,
    name: name.trim(),
    academicYear: academicYear.trim(),
  });
  if (duplicate) {
    res.status(400);
    throw new Error(
      `Section '${name}' already exists in ${existingUniversity.name} for ${academicYear}`
    );
  }

  const section = await Section.create({
    name: name.trim(),
    code: code.toUpperCase().trim(),
    university,
    academicYear: academicYear.trim(),
    semester: semester.trim(),
    assignedCoaches,
    status: status || 'active',
  });

  // Synchronize assigned coaches' assignedSections
  if (assignedCoaches.length > 0) {
    await User.updateMany(
      { _id: { $in: assignedCoaches } },
      {
        $addToSet: {
          assignedSections: section._id,
          assignedUniversities: university,
        },
      }
    );
  }

  const populatedSection = await Section.findById(section._id)
    .populate('university', 'name code')
    .populate('assignedCoaches', 'name email');

  res.status(201).json({
    success: true,
    message: 'Section created successfully',
    data: populatedSection,
  });
});

/**
 * @desc    Update section
 * @route   PUT /api/sections/:id
 * @access  Private (Super Admin only)
 */
const updateSection = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    academicYear,
    semester,
    assignedCoaches,
    status,
  } = req.body;

  const section = await Section.findById(req.params.id);
  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  if (name) section.name = name.trim();
  if (code) section.code = code.toUpperCase().trim();
  if (academicYear) section.academicYear = academicYear.trim();
  if (semester) section.semester = semester.trim();
  if (status) section.status = status;

  // Handle coach assignments synchronization
  if (Array.isArray(assignedCoaches)) {
    const previousCoaches = (section.assignedCoaches || []).map((id) => id.toString());
    const newCoaches = assignedCoaches.map((id) => id.toString());

    // Coaches removed from this section
    const removedCoaches = previousCoaches.filter((c) => !newCoaches.includes(c));
    if (removedCoaches.length > 0) {
      await User.updateMany(
        { _id: { $in: removedCoaches } },
        { $pull: { assignedSections: section._id } }
      );
    }

    // Coaches added to this section
    const addedCoaches = newCoaches.filter((c) => !previousCoaches.includes(c));
    if (addedCoaches.length > 0) {
      await User.updateMany(
        { _id: { $in: addedCoaches } },
        {
          $addToSet: {
            assignedSections: section._id,
            assignedUniversities: section.university,
          },
        }
      );
    }

    section.assignedCoaches = assignedCoaches;
  }

  const updatedSection = await section.save();

  const populatedSection = await Section.findById(updatedSection._id)
    .populate('university', 'name code')
    .populate('assignedCoaches', 'name email');

  res.status(200).json({
    success: true,
    message: 'Section updated successfully',
    data: populatedSection,
  });
});

module.exports = {
  getSections,
  getSectionById,
  createSection,
  updateSection,
};

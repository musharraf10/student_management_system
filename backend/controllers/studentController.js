const ExcelJS = require('exceljs');
const Student = require('../models/Student');
const University = require('../models/University');
const Section = require('../models/Section');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all students (Role-isolated & filtered)
 * @route   GET /api/students
 * @access  Private
 */
const getStudents = asyncHandler(async (req, res) => {
  let query = {};

  // Success Coach data isolation
  if (req.user.role === 'coach') {
    query.section = { $in: req.user.assignedSections || [] };
    query.university = { $in: req.user.assignedUniversities || [] };
  }

  // Filter by university
  if (req.query.university) {
    if (
      req.user.role === 'coach' &&
      !(req.user.assignedUniversities || []).some(
        (u) => u.toString() === req.query.university
      )
    ) {
      res.status(403);
      throw new Error('Access denied to students of this university');
    }
    query.university = req.query.university;
  }

  // Filter by section
  if (req.query.section) {
    if (
      req.user.role === 'coach' &&
      !(req.user.assignedSections || []).some(
        (s) => s.toString() === req.query.section
      )
    ) {
      res.status(403);
      throw new Error('Access denied to students of this section');
    }
    query.section = req.query.section;
  }

  // Filter by status (active, inactive, all)
  if (req.query.status && req.query.status !== 'all') {
    query.status = req.query.status;
  }

  // Search by roll number, NIAT ID, or name
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { rollNumber: searchRegex },
      { niatId: searchRegex },
      { parentName: searchRegex },
    ];
  }

  const students = await Student.find(query)
    .populate('university', 'name code location status')
    .populate('section', 'name code academicYear semester status')
    .sort({ rollNumber: 1 });

  res.status(200).json({
    success: true,
    count: students.length,
    data: students,
  });
});

/**
 * @desc    Get single student by ID
 * @route   GET /api/students/:id
 * @access  Private
 */
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('university', 'name code location status')
    .populate('section', 'name code academicYear semester status');

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Success Coach isolation check
  if (req.user.role === 'coach') {
    const isAssignedSection = (req.user.assignedSections || []).some(
      (sId) => sId.toString() === student.section?._id.toString()
    );
    if (!isAssignedSection) {
      res.status(403);
      throw new Error('Access denied: You are not assigned to this student\'s section');
    }
  }

  res.status(200).json({
    success: true,
    data: student,
  });
});

/**
 * @desc    Create new student
 * @route   POST /api/students
 * @access  Private (Super Admin OR Coach with addStudents permission)
 */
const createStudent = asyncHandler(async (req, res) => {
  const {
    rollNumber,
    niatId,
    name,
    parentName,
    parentPhone,
    studentPhone,
    university,
    section,
    academicYear,
    status,
    attendanceStartDate,
  } = req.body;

  if (
    !rollNumber ||
    !niatId ||
    !name ||
    !parentName ||
    !parentPhone ||
    !university ||
    !section ||
    !academicYear
  ) {
    res.status(400);
    throw new Error('Please provide all required student details');
  }

  // If coach, verify authorization on the university and section
  if (req.user.role === 'coach') {
    if (!req.user.permissions?.addStudents) {
      res.status(403);
      throw new Error('You do not have permission to add students');
    }
    const hasSection = (req.user.assignedSections || []).some(
      (s) => s.toString() === section
    );
    if (!hasSection) {
      res.status(403);
      throw new Error('You can only add students to your assigned sections');
    }
  }

  // Verify section belongs to university
  const sectionDoc = await Section.findById(section);
  if (!sectionDoc) {
    res.status(404);
    throw new Error('Selected section does not exist');
  }
  if (sectionDoc.university.toString() !== university) {
    res.status(400);
    throw new Error('The selected section does not belong to the selected university');
  }

  // Check unique NIAT ID within university
  const existingNiat = await Student.findOne({
    university,
    niatId: niatId.toUpperCase().trim(),
  });
  if (existingNiat) {
    res.status(400);
    throw new Error(`A student with NIAT ID '${niatId.toUpperCase().trim()}' already exists in this university`);
  }

  const parsedStartDate = attendanceStartDate && !isNaN(Date.parse(attendanceStartDate))
    ? new Date(attendanceStartDate)
    : new Date();

  const student = await Student.create({
    rollNumber: rollNumber.trim(),
    niatId: niatId.toUpperCase().trim(),
    name: name.trim(),
    parentName: parentName.trim(),
    parentPhone: parentPhone.trim(),
    studentPhone: studentPhone ? studentPhone.trim() : '',
    university,
    section,
    academicYear: academicYear.trim(),
    status: status || 'active',
    isActive: status === 'inactive' ? false : true,
    attendanceStartDate: parsedStartDate,
  });

  const populatedStudent = await Student.findById(student._id)
    .populate('university', 'name code')
    .populate('section', 'name code semester');

  res.status(201).json({
    success: true,
    message: 'Student registered successfully',
    data: populatedStudent,
  });
});

/**
 * @desc    Update student information
 * @route   PUT /api/students/:id
 * @access  Private (Super Admin OR Coach with editStudents permission)
 */
const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Authorization check for coach
  if (req.user.role === 'coach') {
    if (!req.user.permissions?.editStudents) {
      res.status(403);
      throw new Error('You do not have permission to edit students');
    }
    const hasSection = (req.user.assignedSections || []).some(
      (s) => s.toString() === student.section.toString()
    );
    if (!hasSection) {
      res.status(403);
      throw new Error('You can only edit students in your assigned sections');
    }
  }

  const {
    rollNumber,
    niatId,
    name,
    parentName,
    parentPhone,
    studentPhone,
    status,
    academicYear,
    attendanceStartDate,
  } = req.body;

  // Check unique NIAT ID if modified
  if (niatId && niatId.toUpperCase().trim() !== student.niatId) {
    const existingNiat = await Student.findOne({
      university: student.university,
      niatId: niatId.toUpperCase().trim(),
      _id: { $ne: student._id },
    });
    if (existingNiat) {
      res.status(400);
      throw new Error(`NIAT ID '${niatId.toUpperCase().trim()}' is already assigned to another student`);
    }
    student.niatId = niatId.toUpperCase().trim();
  }

  if (rollNumber) student.rollNumber = rollNumber.trim();
  if (name) student.name = name.trim();
  if (parentName) student.parentName = parentName.trim();
  if (parentPhone) student.parentPhone = parentPhone.trim();
  if (studentPhone !== undefined) studentPhone ? student.studentPhone = studentPhone.trim() : student.studentPhone = '';
  if (status) {
    student.status = status;
    student.isActive = status === 'active';
  }
  if (academicYear) student.academicYear = academicYear.trim();
  if (attendanceStartDate && !isNaN(Date.parse(attendanceStartDate))) {
    student.attendanceStartDate = new Date(attendanceStartDate);
  }

  await student.save();

  const updated = await Student.findById(student._id)
    .populate('university', 'name code')
    .populate('section', 'name code semester');

  res.status(200).json({
    success: true,
    message: 'Student updated successfully',
    data: updated,
  });
});

/**
 * @desc    Transfer student to another section
 * @route   PATCH /api/students/:id/transfer
 * @access  Private (Super Admin only)
 */
const transferStudent = asyncHandler(async (req, res) => {
  const { newSectionId } = req.body;

  if (!newSectionId) {
    res.status(400);
    throw new Error('Please provide the new section ID');
  }

  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const newSection = await Section.findById(newSectionId);
  if (!newSection) {
    res.status(404);
    throw new Error('Target section not found');
  }

  if (newSection.university.toString() !== student.university.toString()) {
    res.status(400);
    throw new Error('Student can only be transferred to a section within the same university');
  }

  student.section = newSection._id;
  await student.save();

  const updated = await Student.findById(student._id)
    .populate('university', 'name code')
    .populate('section', 'name code semester');

  res.status(200).json({
    success: true,
    message: `Student transferred to section ${newSection.name} successfully`,
    data: updated,
  });
});

/**
 * @desc    Import students from Excel (.xlsx) file
 * @route   POST /api/students/import-excel
 * @access  Private (Super Admin OR Coach with addStudents permission)
 */
const importStudentsExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an Excel (.xlsx) file');
  }

  const { university, section, academicYear } = req.body;

  if (!university || !section || !academicYear) {
    res.status(400);
    throw new Error('University, section, and academicYear are required for import');
  }

  // Coach authorization check
  if (req.user.role === 'coach') {
    if (!req.user.permissions?.addStudents) {
      res.status(403);
      throw new Error('You do not have permission to import students');
    }
    const isAssigned = (req.user.assignedSections || []).some(
      (s) => s.toString() === section
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('You can only import students into your assigned sections');
    }
  }

  const sectionDoc = await Section.findById(section);
  if (!sectionDoc || sectionDoc.university.toString() !== university) {
    res.status(400);
    throw new Error('Invalid university or section association');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    res.status(400);
    throw new Error('Excel workbook contains no sheets');
  }

  // Map header columns flexibly
  const headerRow = worksheet.getRow(1);
  const colIndexMap = {};

  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (val.includes('roll') || val.includes('chalapathi')) colIndexMap.rollNumber = colNumber;
    else if (val.includes('niat')) colIndexMap.niatId = colNumber;
    else if (val.includes('student') || val === 'name') colIndexMap.name = colNumber;
    else if (val.includes('parentname') || val.includes('father') || val.includes('guardian')) colIndexMap.parentName = colNumber;
    else if (val.includes('parentphone') || val.includes('parentmobile') || (val.includes('parent') && val.includes('phone'))) colIndexMap.parentPhone = colNumber;
    else if (val.includes('studentphone') || val.includes('studentmobile') || val.includes('phone') || val.includes('mobile')) {
      if (!colIndexMap.studentPhone) colIndexMap.studentPhone = colNumber;
    } else if (val.includes('startdate') || val.includes('enrollment') || val.includes('joiningdate') || val.includes('attendance')) {
      if (!colIndexMap.attendanceStartDate) colIndexMap.attendanceStartDate = colNumber;
    }
  });

  // Fallback if headers not found by name: positional defaults
  if (!colIndexMap.rollNumber) colIndexMap.rollNumber = 1;
  if (!colIndexMap.name) colIndexMap.name = 2;
  if (!colIndexMap.niatId) colIndexMap.niatId = 3;
  if (!colIndexMap.parentName) colIndexMap.parentName = 4;
  if (!colIndexMap.parentPhone) colIndexMap.parentPhone = 5;
  if (!colIndexMap.studentPhone) colIndexMap.studentPhone = 6;

  // Retrieve existing NIAT IDs to prevent duplicate inserts
  const existingStudents = await Student.find({ university }).select('niatId rollNumber');
  const existingNiatSet = new Set(existingStudents.map((s) => s.niatId));

  const studentsToInsert = [];
  const seenNiatInSheet = new Set();
  const errors = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const getCellValue = (col) => {
      const cell = row.getCell(col);
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object' && cell.value.text) return String(cell.value.text).trim();
      return String(cell.value).trim();
    };

    const rollNumber = getCellValue(colIndexMap.rollNumber);
    const name = getCellValue(colIndexMap.name);
    const niatId = getCellValue(colIndexMap.niatId).toUpperCase();
    const parentName = getCellValue(colIndexMap.parentName);
    const parentPhone = getCellValue(colIndexMap.parentPhone);
    const studentPhone = colIndexMap.studentPhone ? getCellValue(colIndexMap.studentPhone) : '';

    // Ignore completely blank rows
    if (!rollNumber && !name && !niatId) return;

    if (!rollNumber || !name || !niatId || !parentName || !parentPhone) {
      errors.push({
        row: rowNumber,
        reason: 'Missing mandatory fields (Roll Number, Name, NIAT ID, Parent Name, Parent Phone)',
      });
      return;
    }

    if (existingNiatSet.has(niatId)) {
      errors.push({
        row: rowNumber,
        reason: `Student with NIAT ID '${niatId}' already exists in this university`,
      });
      return;
    }

    if (seenNiatInSheet.has(niatId)) {
      errors.push({
        row: rowNumber,
        reason: `Duplicate NIAT ID '${niatId}' appears multiple times in uploaded file`,
      });
      return;
    }

    seenNiatInSheet.add(niatId);

    const startDateRaw = colIndexMap.attendanceStartDate ? getCellValue(colIndexMap.attendanceStartDate) : '';
    const studentStartDate = startDateRaw && !isNaN(Date.parse(startDateRaw))
      ? new Date(startDateRaw)
      : (req.body.attendanceStartDate && !isNaN(Date.parse(req.body.attendanceStartDate))
          ? new Date(req.body.attendanceStartDate)
          : new Date());

    studentsToInsert.push({
      rollNumber,
      name,
      niatId,
      parentName,
      parentPhone,
      studentPhone,
      university,
      section,
      academicYear,
      status: 'active',
      isActive: true,
      attendanceStartDate: studentStartDate,
    });
  });

  let importedCount = 0;
  if (studentsToInsert.length > 0) {
    const inserted = await Student.insertMany(studentsToInsert, { ordered: false });
    importedCount = inserted.length;
  }

  res.status(200).json({
    success: true,
    message: `Excel import processed: ${importedCount} student(s) imported, ${errors.length} skipped`,
    importedCount,
    skippedCount: errors.length,
    errors,
  });
});

/**
 * @desc    Preview and validate students Excel (.xlsx) file before importing
 * @route   POST /api/students/preview-excel
 * @access  Private (Super Admin OR Coach with addStudents permission)
 */
const previewStudentsExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an Excel (.xlsx) file');
  }

  const { university, section, academicYear } = req.body;

  if (!university || !section || !academicYear) {
    res.status(400);
    throw new Error('University, section, and academicYear are required for preview');
  }

  if (req.user.role === 'coach') {
    if (!req.user.permissions?.addStudents) {
      res.status(403);
      throw new Error('You do not have permission to import students');
    }
    const isAssigned = (req.user.assignedSections || []).some(
      (s) => s.toString() === section
    );
    if (!isAssigned) {
      res.status(403);
      throw new Error('You can only import students into your assigned sections');
    }
  }

  const sectionDoc = await Section.findById(section);
  if (!sectionDoc || sectionDoc.university.toString() !== university) {
    res.status(400);
    throw new Error('Invalid university or section association');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(req.file.buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    res.status(400);
    throw new Error('Excel workbook contains no sheets');
  }

  const headerRow = worksheet.getRow(1);
  const colIndexMap = {};

  headerRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (val.includes('roll') || val.includes('chalapathi')) colIndexMap.rollNumber = colNumber;
    else if (val.includes('niat')) colIndexMap.niatId = colNumber;
    else if (val.includes('student') || val === 'name') colIndexMap.name = colNumber;
    else if (val.includes('parentname') || val.includes('father') || val.includes('guardian')) colIndexMap.parentName = colNumber;
    else if (val.includes('parentphone') || val.includes('parentmobile') || (val.includes('parent') && val.includes('phone'))) colIndexMap.parentPhone = colNumber;
    else if (val.includes('studentphone') || val.includes('studentmobile') || val.includes('phone') || val.includes('mobile')) {
      if (!colIndexMap.studentPhone) colIndexMap.studentPhone = colNumber;
    } else if (val.includes('startdate') || val.includes('enrollment') || val.includes('joiningdate') || val.includes('attendance')) {
      if (!colIndexMap.attendanceStartDate) colIndexMap.attendanceStartDate = colNumber;
    }
  });

  if (!colIndexMap.rollNumber) colIndexMap.rollNumber = 1;
  if (!colIndexMap.name) colIndexMap.name = 2;
  if (!colIndexMap.niatId) colIndexMap.niatId = 3;
  if (!colIndexMap.parentName) colIndexMap.parentName = 4;
  if (!colIndexMap.parentPhone) colIndexMap.parentPhone = 5;
  if (!colIndexMap.studentPhone) colIndexMap.studentPhone = 6;

  const existingStudents = await Student.find({ university }).select('niatId rollNumber');
  const existingNiatSet = new Set(existingStudents.map((s) => s.niatId));

  const seenNiatInSheet = new Set();
  const validRows = [];
  const previewRows = [];
  const errors = [];
  let missingFieldsCount = 0;
  let duplicateDbCount = 0;
  let duplicateFileCount = 0;
  let totalDataRows = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const getCellValue = (col) => {
      const cell = row.getCell(col);
      if (!cell || cell.value === null || cell.value === undefined) return '';
      if (typeof cell.value === 'object' && cell.value.text) return String(cell.value.text).trim();
      return String(cell.value).trim();
    };

    const rollNumber = getCellValue(colIndexMap.rollNumber);
    const name = getCellValue(colIndexMap.name);
    const niatId = getCellValue(colIndexMap.niatId).toUpperCase();
    const parentName = getCellValue(colIndexMap.parentName);
    const parentPhone = getCellValue(colIndexMap.parentPhone);
    const studentPhone = colIndexMap.studentPhone ? getCellValue(colIndexMap.studentPhone) : '';

    if (!rollNumber && !name && !niatId) return; // Skip empty row
    totalDataRows++;

    let isValid = true;
    let issue = '';

    if (!rollNumber || !name || !niatId || !parentName || !parentPhone) {
      isValid = false;
      issue = 'Missing mandatory fields';
      missingFieldsCount++;
      errors.push({ row: rowNumber, rollNumber, name, niatId, reason: issue });
    } else if (existingNiatSet.has(niatId)) {
      isValid = false;
      issue = `NIAT ID '${niatId}' already exists in university`;
      duplicateDbCount++;
      errors.push({ row: rowNumber, rollNumber, name, niatId, reason: issue });
    } else if (seenNiatInSheet.has(niatId)) {
      isValid = false;
      issue = `Duplicate NIAT ID '${niatId}' in this file`;
      duplicateFileCount++;
      errors.push({ row: rowNumber, rollNumber, name, niatId, reason: issue });
    } else {
      seenNiatInSheet.add(niatId);
      validRows.push({ rollNumber, name, niatId, parentName, parentPhone, studentPhone });
    }

    if (previewRows.length < 10) {
      previewRows.push({
        rowNumber,
        rollNumber: rollNumber || '—',
        name: name || '—',
        niatId: niatId || '—',
        parentName: parentName || '—',
        parentPhone: parentPhone || '—',
        studentPhone: studentPhone || '—',
        isValid,
        issue,
      });
    }
  });

  res.status(200).json({
    success: true,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    totalRows: totalDataRows,
    validCount: validRows.length,
    invalidCount: errors.length,
    validationSummary: {
      valid: validRows.length,
      missingFields: missingFieldsCount,
      duplicateDb: duplicateDbCount,
      duplicateFile: duplicateFileCount,
    },
    previewRows,
    errors: errors.slice(0, 50),
  });
});

/**
 * @desc    Export student directory to Excel (.xlsx)
 * @route   GET /api/students/export-excel
 * @access  Private (Super Admin OR Coach with exportReports permission)
 */
const exportStudentsExcel = asyncHandler(async (req, res) => {
  // Authorization check for coach
  if (req.user.role === 'coach' && !req.user.permissions?.exportReports) {
    res.status(403);
    throw new Error('You do not have permission to export reports');
  }

  let query = {};
  if (req.user.role === 'coach') {
    query.section = { $in: req.user.assignedSections || [] };
    query.university = { $in: req.user.assignedUniversities || [] };
  }

  if (req.query.university) query.university = req.query.university;
  if (req.query.section) query.section = req.query.section;
  if (req.query.status) query.status = req.query.status;

  const students = await Student.find(query)
    .populate('university', 'name code')
    .populate('section', 'name code semester')
    .sort({ rollNumber: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Freeze top row
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  worksheet.columns = [
    { header: 'Roll Number', key: 'rollNumber', width: 18 },
    { header: 'Student Name', key: 'name', width: 26 },
    { header: 'NIAT ID', key: 'niatId', width: 18 },
    { header: 'Parent Name', key: 'parentName', width: 24 },
    { header: 'Parent Phone', key: 'parentPhone', width: 18 },
    { header: 'Student Phone', key: 'studentPhone', width: 18 },
    { header: 'University', key: 'university', width: 26 },
    { header: 'Section', key: 'section', width: 16 },
    { header: 'Academic Year', key: 'academicYear', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  // Header row styling - Professional Slate palette
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' }, // Slate-700
  };
  headerRow.height = 24;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  students.forEach((s) => {
    worksheet.addRow({
      rollNumber: s.rollNumber,
      name: s.name,
      niatId: s.niatId,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      studentPhone: s.studentPhone || '',
      university: s.university?.name || '',
      section: s.section?.name || '',
      academicYear: s.academicYear,
      status: s.status,
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=Students_Export.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc    Deactivate (soft delete) student
 * @route   PATCH /api/students/:id/deactivate
 * @access  Private (Super Admin OR Coach with deleteStudents permission)
 */
const deactivateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Authorization check for coach
  if (req.user.role === 'coach') {
    if (!req.user.permissions?.deleteStudents) {
      res.status(403);
      throw new Error('You do not have permission to delete or deactivate students');
    }
    const hasSection = (req.user.assignedSections || []).some(
      (s) => s.toString() === student.section.toString()
    );
    const hasUni = (req.user.assignedUniversities || []).some(
      (u) => u.toString() === student.university.toString()
    );
    if (!hasSection && !hasUni) {
      res.status(403);
      throw new Error('Access denied: You can only deactivate students in your assigned sections');
    }
  }

  const prevStatus = student.status || 'active';
  student.status = 'inactive';
  student.isActive = false;
  student.deletedAt = new Date();
  student.deletedBy = req.user._id;

  await student.save();

  // Audit log entry
  await AuditLog.create({
    university: student.university,
    section: student.section,
    student: student._id,
    actionType: 'student_deactivate',
    previousStatus: prevStatus,
    newStatus: 'inactive',
    reason: req.body.reason || 'Student deactivated from active roster',
    updatedBy: req.user._id,
  });

  const populated = await Student.findById(student._id)
    .populate('university', 'name code')
    .populate('section', 'name code semester');

  res.status(200).json({
    success: true,
    message: 'Student deactivated successfully',
    data: populated,
  });
});

/**
 * @desc    Restore deactivated student to active roster
 * @route   PATCH /api/students/:id/restore
 * @access  Private (Super Admin OR Coach with deleteStudents permission)
 */
const restoreStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Authorization check for coach
  if (req.user.role === 'coach') {
    if (!req.user.permissions?.deleteStudents) {
      res.status(403);
      throw new Error('You do not have permission to restore students');
    }
    const hasSection = (req.user.assignedSections || []).some(
      (s) => s.toString() === student.section.toString()
    );
    const hasUni = (req.user.assignedUniversities || []).some(
      (u) => u.toString() === student.university.toString()
    );
    if (!hasSection && !hasUni) {
      res.status(403);
      throw new Error('Access denied: You can only restore students in your assigned sections');
    }
  }

  student.status = 'active';
  student.isActive = true;
  student.deletedAt = null;
  student.deletedBy = null;

  await student.save();

  // Audit log entry
  await AuditLog.create({
    university: student.university,
    section: student.section,
    student: student._id,
    actionType: 'student_restore',
    previousStatus: 'inactive',
    newStatus: 'active',
    reason: req.body.reason || 'Student restored to active roster',
    updatedBy: req.user._id,
  });

  const populated = await Student.findById(student._id)
    .populate('university', 'name code')
    .populate('section', 'name code semester');

  res.status(200).json({
    success: true,
    message: 'Student restored to active roster successfully',
    data: populated,
  });
});

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  transferStudent,
  deactivateStudent,
  restoreStudent,
  importStudentsExcel,
  previewStudentsExcel,
  exportStudentsExcel,
};

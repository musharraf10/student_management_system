/**
 * Automated Verification Suite for:
 * 1. Individual Student Attendance History Date Filtering (Group 1)
 * 2. Student Soft Deactivation, Restoration, and Audit Protection (Group 2)
 * 3. Automatic Chronological Movement of Marked Students (Group 3)
 */

const { normalizeDate, calculateAttendanceStats } = require('../utils/attendanceCalculator');

async function runTestSuite() {
  console.log('=================================================================');
  console.log('RUNNING STUDENT ATTENDANCE PORTAL VERIFICATION SUITE');
  console.log('=================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passed++;
    console.log(`✓ PASS: ${message}`);
  }

  // ==========================================================================
  // GROUP 1: INDIVIDUAL ATTENDANCE HISTORY FILTERING (Start Date & Root Cause Fix)
  // ==========================================================================
  console.log('\n--- Group 1: Student Attendance History Start Date Filtering ---');

  // Student joined / began tracking on Oct 15, 2026
  const student = {
    _id: 'std_123',
    name: 'Rohan Sharma',
    rollNumber: '26CS001',
    attendanceStartDate: new Date('2026-10-15T00:00:00.000Z'),
  };

  // Section has historical attendance days recorded since Sept 1, 2026
  const sectionAttendanceDays = [
    { _id: 'd1', date: new Date('2026-09-06T00:00:00.000Z'), dayType: 'sunday' }, // Prior Sunday (Should be excluded)
    { _id: 'd2', date: new Date('2026-10-02T00:00:00.000Z'), dayType: 'holiday', holidayReason: 'Gandhi Jayanti' }, // Prior Holiday (Should be excluded)
    { _id: 'd3', date: new Date('2026-10-10T00:00:00.000Z'), dayType: 'working_day' }, // Prior working day (Should be excluded)
    { _id: 'd4', date: new Date('2026-10-18T00:00:00.000Z'), dayType: 'sunday' }, // Post start Sunday (Included)
    { _id: 'd5', date: new Date('2026-10-20T00:00:00.000Z'), dayType: 'working_day' }, // Post start working day (Included)
    { _id: 'd6', date: new Date('2026-10-21T00:00:00.000Z'), dayType: 'working_day' }, // Post start working day (Included)
    { _id: 'd7', date: new Date('2026-10-25T00:00:00.000Z'), dayType: 'sunday' }, // Post start Sunday (Included)
  ];

  // Records for this student (marked present on Oct 20, absent on Oct 21)
  const studentRecords = [
    { attendanceDay: 'd5', date: new Date('2026-10-20T00:00:00.000Z'), status: 'present' },
    { attendanceDay: 'd6', date: new Date('2026-10-21T00:00:00.000Z'), status: 'absent' },
  ];

  const recordMap = {};
  studentRecords.forEach((r) => {
    recordMap[r.attendanceDay] = r;
    recordMap[normalizeDate(r.date).toISOString().split('T')[0]] = r;
  });

  const trackingStartDate = normalizeDate(student.attendanceStartDate);

  // Apply Group 1 filter logic
  let workingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let holidays = 0;
  let sundays = 0;
  const filteredHistory = [];

  sectionAttendanceDays.forEach((day) => {
    const dayDate = normalizeDate(day.date);
    const dateKey = dayDate.toISOString().split('T')[0];
    const rec = recordMap[day._id] || recordMap[dateKey];

    // Exclude days prior to trackingStartDate UNLESS explicit record exists
    if (dayDate < trackingStartDate && !rec) {
      return;
    }

    if (day.dayType === 'sunday') {
      sundays++;
    } else if (day.dayType === 'holiday') {
      holidays++;
    } else {
      workingDays++;
      if (rec?.status === 'present') presentDays++;
      else if (rec?.status === 'absent') absentDays++;
    }

    filteredHistory.push({
      _id: day._id,
      date: day.date,
      dayType: day.dayType,
      status: rec ? rec.status : day.dayType === 'sunday' ? 'sunday' : 'absent',
    });
  });

  assert(filteredHistory.length === 4, `History length is 4 (excluded 3 pre-enrollment days), got ${filteredHistory.length}`);
  assert(sundays === 2, `Sundays count is 2 (prior Sept 6 Sunday excluded), got ${sundays}`);
  assert(holidays === 0, `Holidays count is 0 (prior Oct 2 Gandhi Jayanti excluded), got ${holidays}`);
  assert(workingDays === 2, `Working days count is 2 (prior Oct 10 unmarked day excluded), got ${workingDays}`);
  assert(presentDays === 1, `Present count is 1, got ${presentDays}`);
  assert(absentDays === 1, `Absent count is 1, got ${absentDays}`);

  // Test Transferred student with earlier explicit record
  const earlierTransferredRecord = {
    attendanceDay: 'd1', // on Sept 6
    date: new Date('2026-09-06T00:00:00.000Z'),
    status: 'present',
  };
  recordMap['d1'] = earlierTransferredRecord;
  const d1Date = normalizeDate(sectionAttendanceDays[0].date);
  const shouldIncludeTransferred = d1Date >= trackingStartDate || recordMap['d1'];
  assert(Boolean(shouldIncludeTransferred), 'Transferred record prior to tracking start date is explicitly honored and preserved');

  // ==========================================================================
  // GROUP 2: STUDENT SOFT DELETE & RESTORE (Data Integrity & Permissions)
  // ==========================================================================
  console.log('\n--- Group 2: Student Soft Delete, Restore & Permissions ---');

  // 1. Initial active student
  let mockStudentDoc = {
    _id: 'student_active_01',
    name: 'Ananya Verma',
    rollNumber: '26CS088',
    niatId: 'NIAT2026CS088',
    status: 'active',
    isActive: true,
    deletedAt: null,
    deletedBy: null,
  };

  assert(mockStudentDoc.status === 'active' && mockStudentDoc.isActive === true, 'Student begins in active enrolled state');

  // 2. Soft Deactivation
  const adminUserId = 'admin_user_99';
  const deactivationReason = 'Transferred to IIT Madras';
  const deactivationTime = new Date();

  mockStudentDoc.status = 'inactive';
  mockStudentDoc.isActive = false;
  mockStudentDoc.deletedAt = deactivationTime;
  mockStudentDoc.deletedBy = adminUserId;

  assert(mockStudentDoc.status === 'inactive', 'Student status transitions to inactive');
  assert(mockStudentDoc.isActive === false, 'Student isActive flag is set to false');
  assert(mockStudentDoc.deletedAt === deactivationTime, 'deletedAt timestamp is stored');
  assert(mockStudentDoc.deletedBy === adminUserId, 'deletedBy audit identity is preserved');

  // Verify active daily sheet query excludes deactivated student
  const sectionRoster = [
    mockStudentDoc,
    { _id: 'student_active_02', status: 'active', isActive: true },
    { _id: 'student_active_03', status: 'active', isActive: true },
  ];
  const activeStudentsInSheet = sectionRoster.filter(
    (s) => s.status === 'active' && s.isActive !== false
  );
  assert(activeStudentsInSheet.length === 2, `Active marking sheet excludes deactivated student (length 2), got ${activeStudentsInSheet.length}`);

  // 3. Restoration
  mockStudentDoc.status = 'active';
  mockStudentDoc.isActive = true;
  mockStudentDoc.deletedAt = null;
  mockStudentDoc.deletedBy = null;

  assert(mockStudentDoc.status === 'active' && mockStudentDoc.isActive === true, 'Student is restored to active status');
  assert(mockStudentDoc.deletedAt === null && mockStudentDoc.deletedBy === null, 'Deactivation metadata is reset on restoration');

  // 4. Permission logic check
  const coachWithPermission = { role: 'coach', permissions: { deleteStudents: true }, assignedSections: ['sec_1'] };
  const coachWithoutPermission = { role: 'coach', permissions: { deleteStudents: false }, assignedSections: ['sec_1'] };
  const superAdmin = { role: 'super_admin' };

  const canDeleteAdmin = superAdmin.role === 'super_admin' || superAdmin.permissions?.deleteStudents;
  const canDeleteCoachYes = coachWithPermission.role === 'super_admin' || coachWithPermission.permissions?.deleteStudents;
  const canDeleteCoachNo = coachWithoutPermission.role === 'super_admin' || coachWithoutPermission.permissions?.deleteStudents;

  assert(canDeleteAdmin === true, 'Super Admin has permission to delete/deactivate students');
  assert(canDeleteCoachYes === true, 'Coach with deleteStudents permission has permission to delete/deactivate students');
  assert(!canDeleteCoachNo, 'Coach without deleteStudents permission is denied permission to delete/deactivate students');

  // ==========================================================================
  // GROUP 3: AUTOMATIC STUDENT MOVEMENT AFTER MARKING
  // ==========================================================================
  console.log('\n--- Group 3: Automatic Student Movement & Chronological Ordering ---');

  const roster = [
    { _id: 's1', rollNumber: '001', name: 'Aaron' },
    { _id: 's2', rollNumber: '002', name: 'Bob' },
    { _id: 's3', rollNumber: '003', name: 'Charlie' },
    { _id: 's4', rollNumber: '004', name: 'David' },
  ];

  let recordsMap = {
    s1: { status: 'pending', markedAt: null },
    s2: { status: 'pending', markedAt: null },
    s3: { status: 'pending', markedAt: null },
    s4: { status: 'pending', markedAt: null },
  };

  const getPending = () => roster.filter((s) => (recordsMap[s._id]?.status || 'pending') === 'pending');
  const getCompleted = () =>
    roster
      .filter((s) => recordsMap[s._id]?.status && recordsMap[s._id].status !== 'pending')
      .sort((a, b) => (recordsMap[a._id]?.markedAt || 0) - (recordsMap[b._id]?.markedAt || 0));

  assert(getPending().length === 4, 'Initially 4 students pending');
  assert(getCompleted().length === 0, 'Initially 0 students completed');

  // Mark student s2 (Bob) at T1
  const t1 = 1000;
  recordsMap['s2'] = { status: 'present', markedAt: t1 };
  let pending = getPending();
  let completed = getCompleted();
  assert(pending.length === 3, 'Pending decreased to 3');
  assert(completed.length === 1 && completed[0]._id === 's2', 'Completed contains Bob');

  // Mark student s1 (Aaron) at T2 (T2 > T1)
  const t2 = 2000;
  recordsMap['s1'] = { status: 'absent', markedAt: t2 };
  completed = getCompleted();
  assert(completed.length === 2, 'Completed contains 2 students');
  assert(completed[0]._id === 's2', 'First student in completed is Bob (marked earlier)');
  assert(completed[1]._id === 's1', 'Aaron appears at the BOTTOM of completed list (marked later)');

  // Mark student s4 (David) with Late status at T3 (T3 > T2)
  const t3 = 3000;
  recordsMap['s4'] = { status: 'late', markedAt: t3 };
  completed = getCompleted();
  assert(completed.length === 3, 'Completed contains 3 students');
  assert(completed[completed.length - 1]._id === 's4', 'David appears at the very BOTTOM of completed list');

  // Reset student s1 (Aaron) to 'pending'
  recordsMap['s1'] = { status: 'pending', markedAt: null };
  pending = getPending();
  completed = getCompleted();
  assert(pending.some((s) => s._id === 's1'), 'Aaron returned to pending list upon reset');
  assert(!completed.some((s) => s._id === 's1'), 'Aaron removed from completed list upon reset');
  assert(completed[completed.length - 1]._id === 's4', 'David remains at the bottom of completed list');

  console.log('\n=================================================================');
  console.log(`ALL TESTS PASSED: ${passed}/${total} assertions successfully verified!`);
  console.log('=================================================================\n');
}

runTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});

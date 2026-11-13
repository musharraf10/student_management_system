const University = require('../models/University');
const Section = require('../models/Section');
const Student = require('../models/Student');
const User = require('../models/User');
const AttendanceDay = require('../models/AttendanceDay');
const AttendanceRecord = require('../models/AttendanceRecord');
const { normalizeDate, calculateAttendanceStats } = require('../utils/attendanceCalculator');

const dashboardService = {
  /**
   * Super Admin Dashboard Overview Metrics
   */
  async getSuperAdminMetrics(filters = {}) {
    const { date, university, section, academicYear, semester } = filters;
    const targetDate = date ? normalizeDate(date) : normalizeDate(new Date());

    // 1. Base counts
    const universityQuery = {};
    if (university) universityQuery._id = university;

    const sectionQuery = {};
    if (university) sectionQuery.university = university;
    if (section) sectionQuery._id = section;
    if (academicYear) sectionQuery.academicYear = academicYear;
    if (semester) sectionQuery.semester = semester;

    const studentQuery = { status: 'active' };
    if (university) studentQuery.university = university;
    if (section) studentQuery.section = section;
    if (academicYear) studentQuery.academicYear = academicYear;

    const [
      totalUniversities,
      totalSections,
      totalCoaches,
      totalStudents,
    ] = await Promise.all([
      University.countDocuments({ status: 'active' }),
      Section.countDocuments(sectionQuery),
      User.countDocuments({ role: 'coach', status: 'active' }),
      Student.countDocuments(studentQuery),
    ]);

    // 2. Attendance on target date
    const attendanceDayQuery = { date: targetDate };
    if (university) attendanceDayQuery.university = university;
    if (section) attendanceDayQuery.section = section;

    const daysOnDate = await AttendanceDay.find(attendanceDayQuery).populate('section', 'name code');

    let presentStudents = 0;
    let lateStudents = 0;
    let absentStudents = 0;
    let leaveStudents = 0;
    let onDutyStudents = 0;

    daysOnDate.forEach((d) => {
      presentStudents += d.presentCount || 0;
      lateStudents += d.lateCount || 0;
      absentStudents += d.absentCount || 0;
      leaveStudents += d.leaveCount || 0;
      onDutyStudents += d.onDutyCount || 0;
    });

    const totalMarkedStudents = presentStudents + lateStudents + absentStudents + leaveStudents + onDutyStudents;
    const workingDaysCount = presentStudents + lateStudents + absentStudents; // Denominator for student-day attendance
    const dayStats = calculateAttendanceStats({
      workingDays: workingDaysCount,
      presentDays: presentStudents,
      lateDays: lateStudents,
      absentDays: absentStudents,
      leaveDays: leaveStudents,
      onDutyDays: onDutyStudents,
    });

    // 3. University-wise comparison data
    const allUnis = await University.find({ status: 'active' }).sort({ name: 1 });
    const universityComparisons = await Promise.all(
      allUnis.map(async (u) => {
        const uSectionCount = await Section.countDocuments({ university: u._id, status: 'active' });
        const uStudentCount = await Student.countDocuments({ university: u._id, status: 'active' });

        // Today's attendance for this university
        const uDays = await AttendanceDay.find({ university: u._id, date: targetDate });
        let uPresent = 0;
        let uLate = 0;
        let uAbsent = 0;
        uDays.forEach((d) => {
          uPresent += d.presentCount || 0;
          uLate += d.lateCount || 0;
          uAbsent += d.absentCount || 0;
        });

        const uTotalMarked = uPresent + uLate + uAbsent;
        const uPercentage = uTotalMarked > 0 ? Math.round(((uPresent + uLate) / uTotalMarked) * 10000) / 100 : 0;

        return {
          id: u._id,
          name: u.name,
          code: u.code,
          location: u.location,
          sectionsCount: uSectionCount,
          studentsCount: uStudentCount,
          presentCount: uPresent,
          lateCount: uLate,
          absentCount: uAbsent,
          percentage: uPercentage,
          submittedSections: uDays.length,
        };
      })
    );

    // 4. Recent attendance submissions across system
    const recentSubmissions = await AttendanceDay.find()
      .populate('university', 'name code')
      .populate('section', 'name code semester')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(6);

    return {
      totals: {
        universities: totalUniversities,
        sections: totalSections,
        coaches: totalCoaches,
        students: totalStudents,
        present: presentStudents,
        late: lateStudents,
        absent: absentStudents,
        leave: leaveStudents,
        onDuty: onDutyStudents,
        attendancePercentage: dayStats.percentage,
      },
      universityComparisons,
      recentSubmissions,
      filterDate: targetDate,
    };
  },

  /**
   * Success Coach Dashboard Metrics
   */
  async getCoachMetrics(coachUser, filters = {}) {
    const { date } = filters;
    const targetDate = date ? normalizeDate(date) : normalizeDate(new Date());

    const assignedSectionIds = coachUser.assignedSections || [];
    const assignedUniversityIds = coachUser.assignedUniversities || [];

    // 1. Assigned sections list & total students
    const sections = await Section.find({ _id: { $in: assignedSectionIds }, status: 'active' })
      .populate('university', 'name code')
      .sort({ name: 1 });

    const totalStudents = await Student.countDocuments({
      section: { $in: assignedSectionIds },
      status: 'active',
    });

    // 2. Today's attendance for assigned sections
    const daysOnDate = await AttendanceDay.find({
      section: { $in: assignedSectionIds },
      date: targetDate,
    }).populate('section', 'name code');

    const submittedSectionIds = new Set(daysOnDate.map((d) => d.section?._id?.toString()));

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let onDutyCount = 0;

    daysOnDate.forEach((d) => {
      presentCount += d.presentCount || 0;
      lateCount += d.lateCount || 0;
      absentCount += d.absentCount || 0;
      leaveCount += d.leaveCount || 0;
      onDutyCount += d.onDutyCount || 0;
    });

    const workingDaysCount = presentCount + lateCount + absentCount;
    const stats = calculateAttendanceStats({
      workingDays: workingDaysCount,
      presentDays: presentCount,
      lateDays: lateCount,
      absentDays: absentCount,
      leaveDays: leaveCount,
      onDutyDays: onDutyCount,
    });

    // 3. Pending sections (assigned sections that have not submitted attendance for targetDate)
    const pendingSections = sections.filter(
      (sec) => !submittedSectionIds.has(sec._id.toString())
    );

    // 4. Recent attendance history for coach's sections
    const recentHistory = await AttendanceDay.find({
      section: { $in: assignedSectionIds },
    })
      .populate('section', 'name code')
      .populate('submittedBy', 'name')
      .sort({ date: -1 })
      .limit(6);

    return {
      totals: {
        assignedSectionsCount: sections.length,
        totalStudents,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        leave: leaveCount,
        onDuty: onDutyCount,
        attendancePercentage: stats.percentage,
        pendingCount: pendingSections.length,
      },
      assignedSections: sections,
      pendingSections,
      recentHistory,
      filterDate: targetDate,
    };
  },

  /**
   * Detailed University Dashboard Breakdown
   */
  async getUniversityDetailDashboard(universityId, filters = {}) {
    const { date } = filters;
    const targetDate = date ? normalizeDate(date) : normalizeDate(new Date());

    const university = await University.findById(universityId);
    if (!university) {
      throw new Error('University not found');
    }

    const sections = await Section.find({ university: universityId, status: 'active' })
      .populate('assignedCoaches', 'name email phone')
      .sort({ name: 1 });

    const totalStudents = await Student.countDocuments({
      university: universityId,
      status: 'active',
    });

    const totalCoaches = await User.countDocuments({
      role: 'coach',
      assignedUniversities: universityId,
      status: 'active',
    });

    // Section-wise breakdown for targetDate
    const sectionIds = sections.map((s) => s._id);
    const daysOnDate = await AttendanceDay.find({
      section: { $in: sectionIds },
      date: targetDate,
    });

    const daysMap = {};
    daysOnDate.forEach((d) => {
      daysMap[d.section.toString()] = d;
    });

    const sectionsBreakdown = await Promise.all(
      sections.map(async (sec) => {
        const studentCount = await Student.countDocuments({ section: sec._id, status: 'active' });
        const dayRecord = daysMap[sec._id.toString()];

        let status = 'pending';
        let present = 0;
        let late = 0;
        let absent = 0;
        let percentage = 0;

        if (dayRecord) {
          status = dayRecord.dayType;
          present = dayRecord.presentCount || 0;
          late = dayRecord.lateCount || 0;
          absent = dayRecord.absentCount || 0;
          const totalMarked = present + late + absent;
          if (totalMarked > 0) {
            percentage = Math.round(((present + late) / totalMarked) * 10000) / 100;
          }
        }

        return {
          id: sec._id,
          name: sec.name,
          code: sec.code,
          academicYear: sec.academicYear,
          semester: sec.semester,
          assignedCoaches: sec.assignedCoaches,
          studentCount,
          dayStatus: status,
          presentCount: present,
          lateCount: late,
          absentCount: absent,
          percentage,
          isSubmitted: !!dayRecord,
        };
      })
    );

    let uniPresent = 0;
    let uniLate = 0;
    let uniAbsent = 0;
    daysOnDate.forEach((d) => {
      uniPresent += d.presentCount || 0;
      uniLate += d.lateCount || 0;
      uniAbsent += d.absentCount || 0;
    });

    const uniTotalMarked = uniPresent + uniLate + uniAbsent;
    const overallPercentage = uniTotalMarked > 0 ? Math.round(((uniPresent + uniLate) / uniTotalMarked) * 10000) / 100 : 0;

    return {
      university,
      totals: {
        sectionsCount: sections.length,
        studentsCount: totalStudents,
        coachesCount: totalCoaches,
        presentCount: uniPresent,
        lateCount: uniLate,
        absentCount: uniAbsent,
        overallPercentage,
        submittedSectionsCount: daysOnDate.length,
      },
      sectionsBreakdown,
      filterDate: targetDate,
    };
  },
};

module.exports = dashboardService;

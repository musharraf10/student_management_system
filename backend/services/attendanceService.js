const AttendanceDay = require('../models/AttendanceDay');
const AttendanceRecord = require('../models/AttendanceRecord');
const AuditLog = require('../models/AuditLog');
const Student = require('../models/Student');
const Section = require('../models/Section');
const { normalizeDate, isWorkingDayType, calculateAttendanceStats } = require('../utils/attendanceCalculator');

const attendanceService = {
  /**
   * Get attendance day sheet for a given section and date.
   * If already marked, returns day and records.
   * If not marked, returns enrolled active students for marking.
   */
  async getSectionDailySheet({ sectionId, date }) {
    const normalizedDate = normalizeDate(date);

    const section = await Section.findById(sectionId).populate('university', 'name code');
    if (!section) {
      throw new Error('Section not found');
    }

    // Check if attendance is already recorded for this section & date
    const attendanceDay = await AttendanceDay.findOne({
      section: sectionId,
      date: normalizedDate,
    })
      .populate('submittedBy', 'name email role')
      .populate('lastModifiedBy', 'name email role');

    // Get active students enrolled in this section (exclude soft-deleted/inactive)
    const students = await Student.find({
      section: sectionId,
      status: 'active',
      isActive: { $ne: false },
    }).sort({ rollNumber: 1 });

    // Compute cumulative attendance percentage for each student in this section
    // using the centralized institutional attendance formula
    const pastSectionDays = await AttendanceDay.find({ section: sectionId });
    const workingDaysCount = pastSectionDays.filter((d) => isWorkingDayType(d.dayType)).length;
    const pastDayIds = pastSectionDays.map((d) => d._id);

    const pastRecords = await AttendanceRecord.find({
      section: sectionId,
      attendanceDay: { $in: pastDayIds },
    });

    const studentStatsMap = {};
    pastRecords.forEach((r) => {
      const sId = r.student.toString();
      if (!studentStatsMap[sId]) {
        studentStatsMap[sId] = { present: 0, late: 0, absent: 0, leave: 0, onDuty: 0 };
      }
      if (r.status === 'present') studentStatsMap[sId].present++;
      else if (r.status === 'late') studentStatsMap[sId].late++;
      else if (r.status === 'absent') studentStatsMap[sId].absent++;
      else if (r.status === 'leave') studentStatsMap[sId].leave++;
      else if (r.status === 'on_duty') studentStatsMap[sId].onDuty++;
    });

    const enrichStudent = (studentDoc) => {
      if (!studentDoc) return null;
      const sObj = studentDoc.toObject ? studentDoc.toObject() : { ...studentDoc };
      const stats = studentStatsMap[sObj._id?.toString()] || { present: 0, late: 0, absent: 0 };
      const calculated = calculateAttendanceStats({
        workingDays: workingDaysCount,
        presentDays: stats.present,
        lateDays: stats.late,
        absentDays: stats.absent,
      });
      sObj.attendancePercentage = calculated.percentage;
      sObj.totalWorkingDays = workingDaysCount;
      sObj.attendedDays = stats.present + stats.late;
      return sObj;
    };

    if (attendanceDay) {
      // Fetch existing records
      const records = await AttendanceRecord.find({
        attendanceDay: attendanceDay._id,
      }).populate('student', 'rollNumber niatId name status studentPhone parentName parentPhone');

      const enrichedRecords = records.map((r) => {
        const rObj = r.toObject ? r.toObject() : { ...r };
        if (rObj.student) {
          rObj.student = enrichStudent(rObj.student);
        }
        return rObj;
      });

      return {
        isSubmitted: true,
        attendanceDay,
        section,
        studentsCount: students.length,
        records: enrichedRecords,
      };
    }

    // Not yet submitted
    const enrichedStudents = students.map((s) => enrichStudent(s));

    return {
      isSubmitted: false,
      attendanceDay: null,
      section,
      studentsCount: students.length,
      students: enrichedStudents,
    };
  },

  /**
   * Submit or replace attendance for a section and date.
   */
  async submitAttendance({
    sectionId,
    date,
    dayType,
    holidayReason = '',
    records = [],
    userId,
    userRole,
  }) {
    const normalizedDate = normalizeDate(date);

    const section = await Section.findById(sectionId);
    if (!section) {
      throw new Error('Section not found');
    }

    const isWorking = isWorkingDayType(dayType);

    // If already marked, check if editing is allowed
    let attendanceDay = await AttendanceDay.findOne({
      section: sectionId,
      date: normalizedDate,
    });

    const isUpdate = !!attendanceDay;

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let onDutyCount = 0;

    if (isWorking) {
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Working day and Online class require individual student attendance records');
      }

      records.forEach((r) => {
        if (r.status === 'present') presentCount++;
        else if (r.status === 'absent') absentCount++;
        else if (r.status === 'late') lateCount++;
        else if (r.status === 'leave') leaveCount++;
        else if (r.status === 'on_duty') onDutyCount++;
      });
    }

    if (!attendanceDay) {
      // Create new AttendanceDay
      attendanceDay = await AttendanceDay.create({
        university: section.university,
        section: sectionId,
        date: normalizedDate,
        dayType,
        holidayReason: isWorking ? '' : holidayReason.trim(),
        totalStudents: isWorking ? records.length : 0,
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        onDutyCount,
        submittedBy: userId,
        status: 'submitted',
      });

      // Audit Log for Initial Creation
      await AuditLog.create({
        university: section.university,
        section: sectionId,
        attendanceDay: attendanceDay._id,
        attendanceDate: normalizedDate,
        newStatus: dayType,
        actionType: 'create',
        reason: isWorking ? 'Initial attendance submitted' : `Marked as ${dayType} (${holidayReason})`,
        updatedBy: userId,
      });
    } else {
      // Update existing AttendanceDay
      attendanceDay.dayType = dayType;
      attendanceDay.holidayReason = isWorking ? '' : holidayReason.trim();
      attendanceDay.totalStudents = isWorking ? records.length : 0;
      attendanceDay.presentCount = presentCount;
      attendanceDay.absentCount = absentCount;
      attendanceDay.lateCount = lateCount;
      attendanceDay.leaveCount = leaveCount;
      attendanceDay.onDutyCount = onDutyCount;
      attendanceDay.lastModifiedBy = userId;
      await attendanceDay.save();

      // Audit Log for Bulk Update
      await AuditLog.create({
        university: section.university,
        section: sectionId,
        attendanceDay: attendanceDay._id,
        attendanceDate: normalizedDate,
        newStatus: dayType,
        actionType: 'bulk_mark',
        reason: 'Attendance resubmitted / modified in bulk',
        updatedBy: userId,
      });
    }

    // Upsert individual student attendance records if working day / online class
    if (isWorking) {
      const bulkOps = records.map((r) => ({
        updateOne: {
          filter: {
            section: sectionId,
            date: normalizedDate,
            student: r.studentId,
          },
          update: {
            $set: {
              attendanceDay: attendanceDay._id,
              university: section.university,
              section: sectionId,
              student: r.studentId,
              date: normalizedDate,
              status: r.status,
              remarks: r.remarks ? r.remarks.trim() : '',
            },
          },
          upsert: true,
        },
      }));

      if (bulkOps.length > 0) {
        await AttendanceRecord.bulkWrite(bulkOps);
      }
    } else {
      // If changed to Sunday or Holiday, remove previous individual records for this date
      await AttendanceRecord.deleteMany({
        attendanceDay: attendanceDay._id,
      });
    }

    return attendanceDay;
  },

  /**
   * Update individual student attendance record with audit tracking.
   */
  async updateSingleStudentAttendance({
    recordId,
    newStatus,
    reason = '',
    remarks,
    userId,
  }) {
    const record = await AttendanceRecord.findById(recordId);
    if (!record) {
      throw new Error('Attendance record not found');
    }

    const previousStatus = record.status;
    if (previousStatus === newStatus && remarks === undefined) {
      return record;
    }

    record.status = newStatus;
    if (remarks !== undefined) {
      record.remarks = remarks.trim();
    }
    await record.save();

    // Recompute AttendanceDay summary counts
    const attendanceDay = await AttendanceDay.findById(record.attendanceDay);
    if (attendanceDay) {
      const records = await AttendanceRecord.find({ attendanceDay: attendanceDay._id });
      let p = 0, a = 0, lt = 0, l = 0, od = 0;
      records.forEach((r) => {
        if (r.status === 'present') p++;
        else if (r.status === 'absent') a++;
        else if (r.status === 'late') lt++;
        else if (r.status === 'leave') l++;
        else if (r.status === 'on_duty') od++;
      });

      attendanceDay.presentCount = p;
      attendanceDay.absentCount = a;
      attendanceDay.lateCount = lt;
      attendanceDay.leaveCount = l;
      attendanceDay.onDutyCount = od;
      attendanceDay.lastModifiedBy = userId;
      await attendanceDay.save();

      // Create permanent audit entry
      await AuditLog.create({
        university: record.university,
        section: record.section,
        student: record.student,
        attendanceDay: attendanceDay._id,
        attendanceDate: record.date,
        previousStatus,
        newStatus,
        actionType: 'status_change',
        reason: reason.trim() || 'Manual correction',
        updatedBy: userId,
      });
    }

    return record;
  },

  /**
   * Retrieve audit logs with filters
   */
  async getAuditHistory({ sectionId, studentId, date, universityId, limit = 100 }) {
    const query = {};
    if (sectionId) query.section = sectionId;
    if (studentId) query.student = studentId;
    if (universityId) query.university = universityId;
    if (date) query.attendanceDate = normalizeDate(date);

    return await AuditLog.find(query)
      .populate('student', 'rollNumber niatId name')
      .populate('section', 'name code')
      .populate('university', 'name code')
      .populate('updatedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
  },

  /**
   * Preview university-wide calendar designation (Holiday or Sunday)
   * Lists affected sections and detects conflicts with existing attendance.
   */
  async previewUniversityCalendar({ universityId, date, dayType, holidayReason = '' }) {
    const normalizedDate = normalizeDate(date);
    const sections = await Section.find({ university: universityId, status: 'active' })
      .populate('university', 'name code')
      .sort({ code: 1 });

    const sectionIds = sections.map((s) => s._id);
    const existingDays = await AttendanceDay.find({
      section: { $in: sectionIds },
      date: normalizedDate,
    }).populate('submittedBy', 'name email');

    const dayMap = {};
    existingDays.forEach((d) => {
      dayMap[d.section.toString()] = d;
    });

    const previewList = sections.map((sec) => {
      const existing = dayMap[sec._id.toString()];
      let status = 'new'; // 'new' | 'already_set' | 'conflict'
      let conflictDetails = null;

      if (existing) {
        if (
          existing.dayType === dayType &&
          (dayType !== 'holiday' || existing.holidayReason === holidayReason)
        ) {
          status = 'already_set';
        } else {
          status = 'conflict';
          conflictDetails = {
            existingDayType: existing.dayType,
            existingHolidayReason: existing.holidayReason || '',
            presentCount: existing.presentCount || 0,
            absentCount: existing.absentCount || 0,
            lateCount: existing.lateCount || 0,
            submittedBy: existing.submittedBy?.name || 'Unknown',
          };
        }
      }

      return {
        sectionId: sec._id,
        sectionName: sec.name,
        sectionCode: sec.code,
        status,
        existingDay: existing || null,
        conflictDetails,
      };
    });

    const conflictCount = previewList.filter((p) => p.status === 'conflict').length;
    const newCount = previewList.filter((p) => p.status === 'new').length;
    const alreadySetCount = previewList.filter((p) => p.status === 'already_set').length;

    return {
      universityId,
      date: normalizedDate,
      dayType,
      holidayReason,
      totalActiveSections: sections.length,
      conflictCount,
      newCount,
      alreadySetCount,
      hasConflicts: conflictCount > 0,
      sections: previewList,
    };
  },

  /**
   * Apply university-wide calendar designation (Holiday or Sunday)
   * Applies consistently across active sections with optional conflict resolution.
   */
  async applyUniversityCalendar({
    universityId,
    date,
    dayType,
    holidayReason = '',
    overwriteConflicts = false,
    userId,
  }) {
    const normalizedDate = normalizeDate(date);
    const sections = await Section.find({ university: universityId, status: 'active' });

    let appliedCount = 0;
    let overwrittenCount = 0;
    let skippedCount = 0;

    for (const sec of sections) {
      const existingDay = await AttendanceDay.findOne({
        section: sec._id,
        date: normalizedDate,
      });

      if (existingDay) {
        const isConflict = existingDay.dayType !== dayType;
        if (isConflict) {
          if (!overwriteConflicts) {
            skippedCount++;
            continue;
          }
          // Overwrite conflict
          const oldDayType = existingDay.dayType;
          existingDay.dayType = dayType;
          existingDay.holidayReason = dayType === 'holiday' ? holidayReason.trim() : '';
          existingDay.presentCount = 0;
          existingDay.absentCount = 0;
          existingDay.lateCount = 0;
          existingDay.leaveCount = 0;
          existingDay.onDutyCount = 0;
          existingDay.lastModifiedBy = userId;
          await existingDay.save();

          // Clear individual student records for common holidays / Sundays
          await AttendanceRecord.deleteMany({ attendanceDay: existingDay._id });

          // Record audit log
          await AuditLog.create({
            university: universityId,
            section: sec._id,
            attendanceDay: existingDay._id,
            attendanceDate: normalizedDate,
            previousStatus: oldDayType,
            newStatus: dayType,
            actionType: 'bulk_mark',
            reason: `University Calendar Designation: ${dayType}${
              holidayReason ? ` (${holidayReason})` : ''
            }`,
            updatedBy: userId,
          });

          overwrittenCount++;
          appliedCount++;
        } else {
          // Same day type, update reason if holiday
          if (dayType === 'holiday' && existingDay.holidayReason !== holidayReason) {
            existingDay.holidayReason = holidayReason.trim();
            existingDay.lastModifiedBy = userId;
            await existingDay.save();
          }
          appliedCount++;
        }
      } else {
        // Create fresh AttendanceDay
        const newDay = await AttendanceDay.create({
          university: universityId,
          section: sec._id,
          date: normalizedDate,
          dayType,
          holidayReason: dayType === 'holiday' ? holidayReason.trim() : '',
          totalStudents: sec.studentsCount || 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          leaveCount: 0,
          onDutyCount: 0,
          submittedBy: userId,
        });

        await AuditLog.create({
          university: universityId,
          section: sec._id,
          attendanceDay: newDay._id,
          attendanceDate: normalizedDate,
          previousStatus: 'none',
          newStatus: dayType,
          actionType: 'bulk_mark',
          reason: `University Calendar Designation: ${dayType}${
            holidayReason ? ` (${holidayReason})` : ''
          }`,
          updatedBy: userId,
        });

        appliedCount++;
      }
    }

    return {
      totalSections: sections.length,
      appliedCount,
      overwrittenCount,
      skippedCount,
    };
  },

  /**
   * Batch synchronize offline attendance records with MongoDB.
   * Fully idempotent, supports partial success, and returns per-record acknowledgements.
   */
  async syncAttendanceBatch({ userId, userRole, assignedSections = [], records = [] }) {
    if (!Array.isArray(records) || records.length === 0) {
      return {
        totalProcessed: 0,
        acknowledgedCount: 0,
        failedCount: 0,
        acknowledgedOpIds: [],
        failedRecords: [],
      };
    }

    const VALID_STATUSES = new Set(['present', 'absent', 'late', 'leave', 'on_duty']);
    const VALID_DAY_TYPES = new Set(['working_day', 'online_class', 'sunday', 'holiday']);

    const acknowledgedOpIds = [];
    const failedRecords = [];
    const validRecords = [];

    // 1. Validate each record individually
    for (const r of records) {
      const opId = r.opId || `op_${r.studentId}_${Date.now()}`;

      if (!r.sectionId || !r.studentId || !r.date || !r.status) {
        failedRecords.push({
          opId,
          studentId: r.studentId,
          reason: 'Missing mandatory fields (sectionId, studentId, date, status)',
        });
        continue;
      }

      if (!VALID_STATUSES.has(r.status)) {
        failedRecords.push({
          opId,
          studentId: r.studentId,
          reason: `Invalid status '${r.status}'`,
        });
        continue;
      }

      if (r.dayType && !VALID_DAY_TYPES.has(r.dayType)) {
        failedRecords.push({
          opId,
          studentId: r.studentId,
          reason: `Invalid dayType '${r.dayType}'`,
        });
        continue;
      }

      // Check Coach Section Assignment
      if (userRole === 'coach') {
        const isAssigned = assignedSections.some(
          (s) => s.toString() === r.sectionId.toString()
        );
        if (!isAssigned) {
          failedRecords.push({
            opId,
            studentId: r.studentId,
            reason: 'Access denied: Coach is not assigned to this section',
          });
          continue;
        }
      }

      let normalizedDate;
      try {
        normalizedDate = normalizeDate(r.date);
      } catch (dateErr) {
        failedRecords.push({
          opId,
          studentId: r.studentId,
          reason: 'Invalid attendance date format',
        });
        continue;
      }

      validRecords.push({
        ...r,
        opId,
        normalizedDate,
        dayType: r.dayType || 'working_day',
      });
    }

    // 2. Group valid records by section and normalized date
    const groups = {}; // key: `${sectionId}_${dateKey}`
    validRecords.forEach((r) => {
      const dateKey = r.normalizedDate.toISOString().split('T')[0];
      const groupKey = `${r.sectionId}_${dateKey}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          sectionId: r.sectionId,
          normalizedDate: r.normalizedDate,
          dayType: r.dayType,
          holidayReason: r.holidayReason || '',
          records: [],
        };
      }
      groups[groupKey].records.push(r);
    });

    // 3. Process each group atomically
    for (const groupKey of Object.keys(groups)) {
      const group = groups[groupKey];
      try {
        const section = await Section.findById(group.sectionId);
        if (!section) {
          group.records.forEach((r) => {
            failedRecords.push({ opId: r.opId, reason: 'Target section not found' });
          });
          continue;
        }

        // Find or create AttendanceDay
        let attendanceDay = await AttendanceDay.findOne({
          section: group.sectionId,
          date: group.normalizedDate,
        });

        if (!attendanceDay) {
          attendanceDay = await AttendanceDay.create({
            university: section.university,
            section: group.sectionId,
            date: group.normalizedDate,
            dayType: group.dayType,
            holidayReason: group.holidayReason,
            totalStudents: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            leaveCount: 0,
            onDutyCount: 0,
            submittedBy: userId,
            status: 'submitted',
          });
        } else {
          attendanceDay.lastModifiedBy = userId;
        }

        // Prepare bulk operations for individual student records
        const bulkOps = group.records.map((r) => ({
          updateOne: {
            filter: {
              section: group.sectionId,
              date: group.normalizedDate,
              student: r.studentId,
            },
            update: {
              $set: {
                attendanceDay: attendanceDay._id,
                university: section.university,
                section: group.sectionId,
                student: r.studentId,
                date: group.normalizedDate,
                status: r.status,
                remarks: r.remarks ? r.remarks.trim() : '',
              },
            },
            upsert: true,
          },
        }));

        if (bulkOps.length > 0) {
          await AttendanceRecord.bulkWrite(bulkOps, { ordered: false });
        }

        // Recalculate aggregate metrics for the day
        const allDayRecords = await AttendanceRecord.find({
          attendanceDay: attendanceDay._id,
        });

        let p = 0, a = 0, lt = 0, l = 0, od = 0;
        allDayRecords.forEach((rec) => {
          if (rec.status === 'present') p++;
          else if (rec.status === 'absent') a++;
          else if (rec.status === 'late') lt++;
          else if (rec.status === 'leave') l++;
          else if (rec.status === 'on_duty') od++;
        });

        attendanceDay.presentCount = p;
        attendanceDay.absentCount = a;
        attendanceDay.lateCount = lt;
        attendanceDay.leaveCount = l;
        attendanceDay.onDutyCount = od;
        attendanceDay.totalStudents = allDayRecords.length;
        await attendanceDay.save();

        // Audit log for synchronized batch
        await AuditLog.create({
          university: section.university,
          section: group.sectionId,
          attendanceDay: attendanceDay._id,
          attendanceDate: group.normalizedDate,
          previousStatus: 'offline_cache',
          newStatus: `${group.records.length} records synced`,
          actionType: 'bulk_mark',
          reason: `Synchronized ${group.records.length} attendance records from offline cache`,
          updatedBy: userId,
        });

        // Acknowledge all records in this successfully committed group
        group.records.forEach((r) => acknowledgedOpIds.push(r.opId));
      } catch (groupErr) {
        console.error(`Error processing attendance sync group ${groupKey}:`, groupErr);
        group.records.forEach((r) => {
          failedRecords.push({
            opId: r.opId,
            reason: groupErr.message || 'Database write error during synchronization',
          });
        });
      }
    }

    return {
      totalProcessed: records.length,
      acknowledgedCount: acknowledgedOpIds.length,
      failedCount: failedRecords.length,
      acknowledgedOpIds,
      failedRecords,
    };
  },
};

module.exports = attendanceService;

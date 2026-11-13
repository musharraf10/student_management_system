const ExcelJS = require('exceljs');
const University = require('../models/University');
const Section = require('../models/Section');
const Student = require('../models/Student');
const AttendanceDay = require('../models/AttendanceDay');
const AttendanceRecord = require('../models/AttendanceRecord');
const { normalizeDate, calculateAttendanceStats, isWorkingDayType } = require('../utils/attendanceCalculator');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Helper to apply Classic Academic Navy header styling to an ExcelJS worksheet
 */
const styleHeaderRow = (row, startCol, endCol, bgColor = 'FF1E3A8A', fontColor = 'FFFFFFFF') => {
  for (let c = startCol; c <= endCol; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: fontColor }, size: 10 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  }
};

const reportService = {
  /**
   * 1. Monthly Section-wise Attendance Excel Report
   */
  async generateMonthlySectionReport({ sectionId, month, year, res }) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const section = await Section.findById(sectionId).populate('university', 'name code location');
    if (!section) throw new Error('Section not found');

    const students = await Student.find({ section: sectionId, status: 'active' }).sort({ rollNumber: 1 });
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

    // Query AttendanceDay records for this section in the month
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const attendanceDays = await AttendanceDay.find({
      section: sectionId,
      date: { $gte: startDate, $lte: endDate },
    });

    const dayMap = {}; // 'YYYY-MM-DD' => AttendanceDay
    attendanceDays.forEach((d) => {
      const dateKey = d.date.toISOString().split('T')[0];
      dayMap[dateKey] = d;
    });

    // Query AttendanceRecord records
    const dayIds = attendanceDays.map((d) => d._id);
    const attendanceRecords = await AttendanceRecord.find({
      attendanceDay: { $in: dayIds },
    });

    const recordMap = {}; // 'studentId_YYYY-MM-DD' => status
    attendanceRecords.forEach((r) => {
      const dateKey = r.date.toISOString().split('T')[0];
      const key = `${r.student.toString()}_${dateKey}`;
      recordMap[key] = r.status;
    });

    const workbook = new ExcelJS.Workbook();
    const sheetName = `${section.name} - ${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
    const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));

    // Freeze header rows and student info columns (Columns 1-7)
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 7, // Freeze first 7 columns
        ySplit: 3, // Freeze top 3 title/header rows
      },
    ];

    // Row 1: Title Banner
    worksheet.mergeCells(1, 1, 1, 7 + daysInMonth + 8);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `${section.university?.name} (${section.university?.code}) - Monthly Attendance Sheet: Section ${section.name} [${MONTH_NAMES[m - 1]} ${y}]`;
    titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(1).height = 28;

    // Row 2: Sub-headers (Info | Dates | Summary)
    worksheet.mergeCells(2, 1, 2, 7);
    const infoHeader = worksheet.getCell(2, 1);
    infoHeader.value = 'STUDENT INFORMATION';
    infoHeader.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    infoHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    infoHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(2, 8, 2, 7 + daysInMonth);
    const datesHeader = worksheet.getCell(2, 8);
    datesHeader.value = `DAILY ATTENDANCE DATES (${MONTH_NAMES[m - 1]} ${y})`;
    datesHeader.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    datesHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    datesHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(2, 8 + daysInMonth, 2, 7 + daysInMonth + 8);
    const sumHeader = worksheet.getCell(2, 8 + daysInMonth);
    sumHeader.value = 'MONTHLY SUMMARY & PERCENTAGE';
    sumHeader.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    sumHeader.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // Row 3: Column Headers
    const headers = [
      'Roll Number',
      'Student Name',
      'NIAT ID',
      'Parent Name',
      'Parent Phone',
      'Student Phone',
      'Section',
    ];

    // Add full date headers DD/MM/YYYY (e.g. 01/11/2026)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
      headers.push(dateStr);
    }

    // Add Summary Headers (with Late Days)
    headers.push('Working Days');
    headers.push('Present');
    headers.push('Late');
    headers.push('Absent');
    headers.push('Leave');
    headers.push('On Duty');
    headers.push('Holidays');
    headers.push('Attendance %');

    const headerRow = worksheet.getRow(3);
    headerRow.values = headers;
    headerRow.height = 24;
    styleHeaderRow(headerRow, 1, headers.length);

    // Set Column Widths
    worksheet.getColumn(1).width = 16; // Roll Number
    worksheet.getColumn(2).width = 24; // Name
    worksheet.getColumn(3).width = 16; // NIAT ID
    worksheet.getColumn(4).width = 20; // Parent Name
    worksheet.getColumn(5).width = 15; // Parent Phone
    worksheet.getColumn(6).width = 15; // Student Phone
    worksheet.getColumn(7).width = 12; // Section

    // Ensure date columns are wide enough for DD/MM/YYYY without ### truncation
    for (let d = 1; d <= daysInMonth; d++) {
      worksheet.getColumn(7 + d).width = 12; // Full Date columns
    }

    for (let s = 1; s <= 8; s++) {
      worksheet.getColumn(7 + daysInMonth + s).width = 13; // Summary columns
    }

    // Populate Student Rows
    students.forEach((student, index) => {
      const rowNum = 4 + index;
      const rowValues = [
        student.rollNumber,
        student.name,
        student.niatId,
        student.parentName,
        student.parentPhone,
        student.studentPhone || '',
        section.name,
      ];

      let workingDays = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let onDutyDays = 0;
      let holidays = 0;
      let sundays = 0;

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const curDate = new Date(Date.UTC(y, m - 1, dayNum));
        const dayOfWeek = curDate.getUTCDay(); // 0 = Sunday
        const dateKey = curDate.toISOString().split('T')[0];
        const dayRecord = dayMap[dateKey];

        let code = '-';

        if (dayRecord) {
          if (dayRecord.dayType === 'sunday') {
            code = 'S';
            sundays++;
          } else if (dayRecord.dayType === 'holiday') {
            code = 'H';
            holidays++;
          } else if (dayRecord.dayType === 'online_class' || dayRecord.dayType === 'working_day') {
            workingDays++;
            const studentStatus = recordMap[`${student._id.toString()}_${dateKey}`];
            if (studentStatus === 'present') {
              code = dayRecord.dayType === 'online_class' ? 'O' : 'P';
              presentDays++;
            } else if (studentStatus === 'late') {
              code = 'LT';
              lateDays++;
            } else if (studentStatus === 'absent') {
              code = 'A';
              absentDays++;
            } else if (studentStatus === 'leave') {
              code = 'L';
              leaveDays++;
            } else if (studentStatus === 'on_duty') {
              code = 'OD';
              onDutyDays++;
            } else {
              code = 'P'; // Default if unmarked during working day
              presentDays++;
            }
          }
        } else {
          // If no specific submission in database, check if calendar Sunday
          if (dayOfWeek === 0) {
            code = 'S';
            sundays++;
          }
        }

        rowValues.push(code);
      }

      // Calculate attendance statistics using centralized institutional formula
      const stats = calculateAttendanceStats({
        workingDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        onDutyDays,
        holidays,
        sundays,
      });

      rowValues.push(stats.workingDays);
      rowValues.push(stats.presentDays);
      rowValues.push(stats.lateDays);
      rowValues.push(stats.absentDays);
      rowValues.push(stats.leaveDays);
      rowValues.push(stats.onDutyDays);
      rowValues.push(stats.holidays);
      rowValues.push(`${stats.percentage}%`);

      const dataRow = worksheet.getRow(rowNum);
      dataRow.values = rowValues;
      dataRow.height = 20;

      // Cell border and alignment styling
      for (let colIdx = 1; colIdx <= headers.length; colIdx++) {
        const cell = dataRow.getCell(colIdx);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (colIdx >= 8) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }

        // Attendance Code Colors
        if (colIdx >= 8 && colIdx <= 7 + daysInMonth) {
          const val = cell.value;
          if (val === 'P' || val === 'O') {
            cell.font = { bold: true, color: { argb: 'FF16A34A' } }; // Present Green
          } else if (val === 'LT') {
            cell.font = { bold: true, color: { argb: 'FFF59E0B' } }; // Late Amber
          } else if (val === 'A') {
            cell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Absent Red
          } else if (val === 'L') {
            cell.font = { bold: true, color: { argb: 'FF7C3AED' } }; // Leave Purple
          } else if (val === 'OD') {
            cell.font = { bold: true, color: { argb: 'FF0F766E' } }; // On Duty Teal
          } else if (val === 'S') {
            cell.font = { color: { argb: 'FF94A3B8' } }; // Sunday Slate
          } else if (val === 'H') {
            cell.font = { bold: true, color: { argb: 'FFB45309' } }; // Holiday Amber
          }
        }
      }
    });

    // Dedicated Visible Excel Legend Block
    const legendStartRow = 4 + students.length + 2;
    worksheet.mergeCells(legendStartRow, 1, legendStartRow, 8);
    const legendHeader = worksheet.getCell(legendStartRow, 1);
    legendHeader.value = 'ATTENDANCE STATUS LEGEND & FORMULA';
    legendHeader.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    legendHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    legendHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(legendStartRow).height = 22;

    const legends = [
      { code: 'P', label: 'Present', desc: 'Present in physical class', fill: 'FFDCFCE7', font: 'FF166534' },
      { code: 'LT', label: 'Late', desc: 'Arrived late (counted in Attendance % formula)', fill: 'FFFEF3C7', font: 'FF92400E' },
      { code: 'A', label: 'Absent', desc: 'Unexcused absence', fill: 'FFFEE2E2', font: 'FF991B1B' },
      { code: 'L', label: 'Leave', desc: 'Approved institutional leave', fill: 'FFEDE9FE', font: 'FF5B21B6' },
      { code: 'OD', label: 'On Duty', desc: 'Representing university / official duty', fill: 'FFCCFBF1', font: 'FF115E59' },
      { code: 'O', label: 'Online Class', desc: 'Present in remote online class', fill: 'FFCFFAFE', font: 'FF155E75' },
      { code: 'H', label: 'Holiday', desc: 'Official holiday (excluded from working days)', fill: 'FFFEF3C7', font: 'FFB45309' },
      { code: 'S', label: 'Sunday', desc: 'Institutional Sunday (non-working day)', fill: 'FFF1F5F9', font: 'FF475569' },
    ];

    legends.forEach((item, idx) => {
      const rNum = legendStartRow + 1 + idx;
      const row = worksheet.getRow(rNum);
      row.height = 20;

      const codeCell = row.getCell(1);
      codeCell.value = item.code;
      codeCell.font = { bold: true, size: 10, color: { argb: item.font } };
      codeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } };
      codeCell.alignment = { vertical: 'middle', horizontal: 'center' };

      const labelCell = row.getCell(2);
      labelCell.value = item.label;
      labelCell.font = { bold: true, size: 9, color: { argb: 'FF0F172A' } };
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells(rNum, 3, rNum, 8);
      const descCell = row.getCell(3);
      descCell.value = item.desc;
      descCell.font = { size: 9, color: { argb: 'FF475569' } };
      descCell.alignment = { vertical: 'middle', horizontal: 'left' };

      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Monthly_Attendance_${section.code}_${MONTH_NAMES[m - 1]}_${y}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  },

  /**
   * 2. University-Wide Attendance Excel Report
   */
  async generateUniversityReport({ universityId, month, year, res }) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const university = await University.findById(universityId);
    if (!university) throw new Error('University not found');

    const sections = await Section.find({ university: universityId, status: 'active' }).sort({ name: 1 });
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('University Overview');
    summarySheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

    summarySheet.mergeCells(1, 1, 1, 9);
    const title = summarySheet.getCell(1, 1);
    title.value = `${university.name} (${university.code}) - Attendance Summary [${MONTH_NAMES[m - 1]} ${y}]`;
    title.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    summarySheet.getRow(1).height = 28;

    const sumHeaders = [
      'Section Name',
      'Section Code',
      'Semester',
      'Total Students',
      'Present Records',
      'Late Records',
      'Absent Records',
      'Working Days Recorded',
      'Average Attendance %',
    ];
    const sumRow = summarySheet.getRow(2);
    sumRow.values = sumHeaders;
    sumRow.height = 24;
    styleHeaderRow(sumRow, 1, 9);

    summarySheet.getColumn(1).width = 20;
    summarySheet.getColumn(2).width = 20;
    summarySheet.getColumn(3).width = 16;
    summarySheet.getColumn(4).width = 16;
    summarySheet.getColumn(5).width = 18;
    summarySheet.getColumn(6).width = 16;
    summarySheet.getColumn(7).width = 18;
    summarySheet.getColumn(8).width = 22;
    summarySheet.getColumn(9).width = 22;

    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const studentCount = await Student.countDocuments({ section: sec._id, status: 'active' });

      const days = await AttendanceDay.find({
        section: sec._id,
        date: { $gte: startDate, $lte: endDate },
      });

      let present = 0;
      let late = 0;
      let absent = 0;
      let workingDays = 0;

      days.forEach((d) => {
        if (isWorkingDayType(d.dayType)) {
          workingDays++;
          present += d.presentCount || 0;
          late += d.lateCount || 0;
          absent += d.absentCount || 0;
        }
      });

      const totalMarked = present + late + absent;
      const avgPct = totalMarked > 0 ? `${(Math.round(((present + late) / totalMarked) * 10000) / 100).toFixed(2)}%` : '0.00%';

      const dataRow = summarySheet.getRow(3 + i);
      dataRow.values = [
        sec.name,
        sec.code,
        sec.semester,
        studentCount,
        present,
        late,
        absent,
        workingDays,
        avgPct,
      ];
      dataRow.height = 20;

      for (let c = 1; c <= 9; c++) {
        const cell = dataRow.getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = c <= 3 ? { vertical: 'middle', horizontal: 'left' } : { vertical: 'middle', horizontal: 'center' };
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=University_Attendance_${university.code}_${MONTH_NAMES[m - 1]}_${y}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  },

  /**
   * 3. Semester-Wise Attendance Excel Report
   */
  async generateSemesterReport({
    universityId,
    academicYear,
    startDate,
    endDate,
    sectionId,
    res,
  }) {
    if (!universityId || !academicYear || !startDate || !endDate) {
      throw new Error('Please provide universityId, academicYear, startDate, and endDate');
    }

    const university = await University.findById(universityId);
    if (!university) throw new Error('University not found');

    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);

    const studentQuery = { university: universityId, status: 'active' };
    if (sectionId) studentQuery.section = sectionId;
    if (academicYear) studentQuery.academicYear = academicYear;

    const students = await Student.find(studentQuery)
      .populate('section', 'name code semester')
      .sort({ rollNumber: 1 });

    const attendanceDays = await AttendanceDay.find({
      university: universityId,
      date: { $gte: start, $lte: end },
    });

    const dayIds = attendanceDays.map((d) => d._id);
    const records = await AttendanceRecord.find({
      attendanceDay: { $in: dayIds },
    });

    const studentSummaryMap = {};
    records.forEach((r) => {
      const sId = r.student.toString();
      if (!studentSummaryMap[sId]) {
        studentSummaryMap[sId] = {
          present: 0,
          late: 0,
          absent: 0,
          leave: 0,
          onDuty: 0,
        };
      }
      if (r.status === 'present') studentSummaryMap[sId].present++;
      else if (r.status === 'late') studentSummaryMap[sId].late++;
      else if (r.status === 'absent') studentSummaryMap[sId].absent++;
      else if (r.status === 'leave') studentSummaryMap[sId].leave++;
      else if (r.status === 'on_duty') studentSummaryMap[sId].onDuty++;
    });

    let totalSemesterHolidays = 0;
    const seenHolidays = new Set();
    attendanceDays.forEach((d) => {
      if (d.dayType === 'holiday') {
        const dKey = d.date.toISOString().split('T')[0];
        if (!seenHolidays.has(dKey)) {
          seenHolidays.add(dKey);
          totalSemesterHolidays++;
        }
      }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Semester Report');

    worksheet.views = [{ state: 'frozen', xSplit: 7, ySplit: 2 }];

    worksheet.mergeCells(1, 1, 1, 15);
    const title = worksheet.getCell(1, 1);
    title.value = `${university.name} (${university.code}) - Semester Attendance Report [${academicYear} : ${startDate} to ${endDate}]`;
    title.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(1).height = 28;

    const headers = [
      'Roll Number',
      'Student Name',
      'NIAT ID',
      'Section',
      'Parent Name',
      'Parent Phone',
      'Student Phone',
      'Total Working Days',
      'Present Days',
      'Late Days',
      'Absent Days',
      'Leave Days',
      'On Duty Days',
      'Holidays',
      'Attendance %',
    ];

    const hRow = worksheet.getRow(2);
    hRow.values = headers;
    hRow.height = 24;
    styleHeaderRow(hRow, 1, 15);

    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 24;
    worksheet.getColumn(3).width = 16;
    worksheet.getColumn(4).width = 14;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 15;
    worksheet.getColumn(7).width = 15;
    for (let c = 8; c <= 15; c++) {
      worksheet.getColumn(c).width = 16;
    }

    students.forEach((s, idx) => {
      const summary = studentSummaryMap[s._id.toString()] || { present: 0, late: 0, absent: 0, leave: 0, onDuty: 0 };
      const workingDays = summary.present + summary.late + summary.absent;
      const stats = calculateAttendanceStats({
        workingDays,
        presentDays: summary.present,
        lateDays: summary.late,
        absentDays: summary.absent,
        leaveDays: summary.leave,
        onDutyDays: summary.onDuty,
        holidays: totalSemesterHolidays,
      });

      const row = worksheet.getRow(3 + idx);
      row.values = [
        s.rollNumber,
        s.name,
        s.niatId,
        s.section?.name || '—',
        s.parentName,
        s.parentPhone,
        s.studentPhone || '',
        stats.workingDays,
        stats.presentDays,
        stats.lateDays,
        stats.absentDays,
        stats.leaveDays,
        stats.onDutyDays,
        stats.holidays,
        `${stats.percentage}%`,
      ];
      row.height = 20;

      for (let c = 1; c <= 15; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = c <= 7 ? { vertical: 'middle', horizontal: 'left' } : { vertical: 'middle', horizontal: 'center' };
      }
    });

    // Dedicated Visible Excel Legend Block for Semester Report
    const semLegendStartRow = 3 + students.length + 2;
    worksheet.mergeCells(semLegendStartRow, 1, semLegendStartRow, 7);
    const semLegendHeader = worksheet.getCell(semLegendStartRow, 1);
    semLegendHeader.value = 'SEMESTER REPORT METRICS & STATUS LEGEND';
    semLegendHeader.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    semLegendHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    semLegendHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(semLegendStartRow).height = 22;

    const semLegends = [
      { code: 'Present', desc: 'Full classroom attendance credited', fill: 'FFDCFCE7', font: 'FF166534' },
      { code: 'Late', desc: 'Late arrival (counted in Attendance % formula)', fill: 'FFFEF3C7', font: 'FF92400E' },
      { code: 'Absent', desc: 'Unexcused classroom absence', fill: 'FFFEE2E2', font: 'FF991B1B' },
      { code: 'Leave', desc: 'Authorized leave of absence', fill: 'FFEDE9FE', font: 'FF5B21B6' },
      { code: 'On Duty', desc: 'Institutional duty representation', fill: 'FFCCFBF1', font: 'FF115E59' },
      { code: 'Holidays', desc: 'University-declared holidays (excluded from working days)', fill: 'FFFEF3C7', font: 'FFB45309' },
      { code: 'Attendance %', desc: 'Formula: ((Present + Late) / Working Days) * 100', fill: 'FFF1F5F9', font: 'FF0F172A' },
    ];

    semLegends.forEach((item, idx) => {
      const rNum = semLegendStartRow + 1 + idx;
      const row = worksheet.getRow(rNum);
      row.height = 20;

      const codeCell = row.getCell(1);
      codeCell.value = item.code;
      codeCell.font = { bold: true, size: 9, color: { argb: item.font } };
      codeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } };
      codeCell.alignment = { vertical: 'middle', horizontal: 'center' };

      worksheet.mergeCells(rNum, 2, rNum, 7);
      const descCell = row.getCell(2);
      descCell.value = item.desc;
      descCell.font = { size: 9, color: { argb: 'FF475569' } };
      descCell.alignment = { vertical: 'middle', horizontal: 'left' };

      for (let c = 1; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Semester_Attendance_${university.code}_${academicYear}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  },

  /**
   * 4. Single Student Attendance Excel Report
   */
  async generateStudentReport({ studentId, startDate, endDate, month, year, res }) {
    const student = await Student.findById(studentId)
      .populate('university', 'name code')
      .populate('section', 'name code');
    if (!student) throw new Error('Student not found');

    const m = month ? parseInt(month, 10) : new Date().getUTCMonth() + 1;
    const y = year ? parseInt(year, 10) : new Date().getUTCFullYear();

    let start, end;
    if (startDate && endDate) {
      start = normalizeDate(startDate);
      end = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999));
    } else {
      start = new Date(Date.UTC(y, m - 1, 1));
      end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    }

    const records = await AttendanceRecord.find({
      student: studentId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${student.rollNumber} Report`.slice(0, 31));

    // Title Banner
    worksheet.mergeCells(1, 1, 1, 6);
    const title = worksheet.getCell(1, 1);
    title.value = `${student.name} (${student.rollNumber}) - Attendance Report [${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}]`;
    title.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(1).height = 28;

    // Student Information Block
    worksheet.mergeCells(2, 1, 2, 6);
    const infoCell = worksheet.getCell(2, 1);
    infoCell.value = `University: ${student.university?.name} | Section: ${student.section?.name} | NIAT ID: ${student.niatId} | Parent: ${student.parentName} (${student.parentPhone})`;
    infoCell.font = { size: 10, color: { argb: 'FF334155' } };
    infoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(2).height = 22;

    const headers = ['Date', 'Day', 'Status', 'Remarks', 'Section', 'University'];
    const hRow = worksheet.getRow(3);
    hRow.values = headers;
    hRow.height = 24;
    styleHeaderRow(hRow, 1, 6);

    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 16;
    worksheet.getColumn(3).width = 16;
    worksheet.getColumn(4).width = 24;
    worksheet.getColumn(5).width = 18;
    worksheet.getColumn(6).width = 24;

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let present = 0;
    let late = 0;
    let absent = 0;
    let leave = 0;
    let onDuty = 0;

    records.forEach((r, idx) => {
      const d = new Date(r.date);
      const row = worksheet.getRow(4 + idx);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = DAYS[d.getUTCDay()];

      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'on_duty') onDuty++;

      row.values = [
        dateStr,
        dayName,
        r.status.toUpperCase(),
        r.remarks || '—',
        student.section?.name || '—',
        student.university?.name || '—',
      ];
      row.height = 20;

      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { vertical: 'middle', horizontal: c <= 2 ? 'center' : 'left' };
      }
    });

    const workingDays = present + late + absent;
    const stats = calculateAttendanceStats({
      workingDays,
      presentDays: present,
      lateDays: late,
      absentDays: absent,
      leaveDays: leave,
      onDutyDays: onDuty,
    });

    // Summary block at bottom
    const sumRowIdx = 4 + records.length + 2;
    worksheet.mergeCells(sumRowIdx, 1, sumRowIdx, 6);
    const sumHeader = worksheet.getCell(sumRowIdx, 1);
    sumHeader.value = `SUMMARY: Working Days: ${stats.workingDays} | Present: ${stats.presentDays} | Late: ${stats.lateDays} | Absent: ${stats.absentDays} | Leave: ${stats.leaveDays} | On Duty: ${stats.onDutyDays} | Attendance: ${stats.percentage}%`;
    sumHeader.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    sumHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    worksheet.getRow(sumRowIdx).height = 24;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Student_Attendance_${student.rollNumber}_${start.toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  },

  /**
   * 5. Report Live Preview Data (for interactive dashboard, metrics summary, on-screen table)
   */
  async getReportPreviewData({
    reportType = 'monthly',
    universityId,
    sectionId,
    studentId,
    academicYear,
    month,
    year,
    startDate,
    endDate,
  }) {
    const m = month ? parseInt(month, 10) : new Date().getUTCMonth() + 1;
    const y = year ? parseInt(year, 10) : new Date().getUTCFullYear();

    let start, end;
    if (startDate && endDate) {
      start = normalizeDate(startDate);
      end = new Date(new Date(endDate).setUTCHours(23, 59, 59, 999));
    } else {
      start = new Date(Date.UTC(y, m - 1, 1));
      end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    }

    // Build student query
    const studentQuery = { status: 'active' };
    if (studentId) {
      studentQuery._id = studentId;
    } else {
      if (sectionId) studentQuery.section = sectionId;
      else if (universityId) studentQuery.university = universityId;
      if (academicYear) studentQuery.academicYear = academicYear;
    }

    const students = await Student.find(studentQuery)
      .populate('section', 'name code semester')
      .populate('university', 'name code')
      .sort({ rollNumber: 1 });

    if (students.length === 0) {
      return {
        summary: {
          totalStudents: 0,
          workingDays: 0,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          totalLeave: 0,
          totalOnDuty: 0,
          averagePercentage: 0,
        },
        students: [],
        dateRange: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        },
        meta: {
          reportType,
          monthName: MONTH_NAMES[m - 1],
          year: y,
        },
      };
    }

    // Query AttendanceDay records
    const dayQuery = { date: { $gte: start, $lte: end } };
    if (sectionId) dayQuery.section = sectionId;
    else if (universityId) dayQuery.university = universityId;

    const attendanceDays = await AttendanceDay.find(dayQuery);
    const dayIds = attendanceDays.map((d) => d._id);

    // Compute working days count from attendanceDays if available
    let totalWorkingDays = 0;
    const seenWorkingDates = new Set();
    attendanceDays.forEach((d) => {
      if (isWorkingDayType(d.dayType)) {
        const dKey = d.date.toISOString().split('T')[0];
        if (!seenWorkingDates.has(dKey)) {
          seenWorkingDates.add(dKey);
          totalWorkingDays++;
        }
      }
    });

    // Query AttendanceRecord records
    const studentIds = students.map((s) => s._id);
    let records = [];
    if (dayIds.length > 0) {
      records = await AttendanceRecord.find({
        attendanceDay: { $in: dayIds },
        student: { $in: studentIds },
      });
    } else {
      records = await AttendanceRecord.find({
        student: { $in: studentIds },
        date: { $gte: start, $lte: end },
      });
    }

    // Aggregate attendance counts per student
    const studentStatsMap = {};
    studentIds.forEach((sId) => {
      studentStatsMap[sId.toString()] = {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        onDuty: 0,
      };
    });

    records.forEach((r) => {
      const sId = r.student.toString();
      if (!studentStatsMap[sId]) {
        studentStatsMap[sId] = { present: 0, absent: 0, late: 0, leave: 0, onDuty: 0 };
      }
      if (r.status === 'present') studentStatsMap[sId].present++;
      else if (r.status === 'absent') studentStatsMap[sId].absent++;
      else if (r.status === 'late') studentStatsMap[sId].late++;
      else if (r.status === 'leave') studentStatsMap[sId].leave++;
      else if (r.status === 'on_duty') studentStatsMap[sId].onDuty++;
    });

    let sumPresent = 0;
    let sumAbsent = 0;
    let sumLate = 0;
    let sumLeave = 0;
    let sumOnDuty = 0;
    let sumPercentages = 0;

    const studentList = students.map((s) => {
      const counts = studentStatsMap[s._id.toString()] || {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        onDuty: 0,
      };

      const studentWorkingDays =
        totalWorkingDays > 0
          ? totalWorkingDays
          : counts.present + counts.absent + counts.late;

      const stats = calculateAttendanceStats({
        workingDays: studentWorkingDays,
        presentDays: counts.present,
        absentDays: counts.absent,
        lateDays: counts.late,
        leaveDays: counts.leave,
        onDutyDays: counts.onDuty,
      });

      sumPresent += stats.presentDays;
      sumAbsent += stats.absentDays;
      sumLate += stats.lateDays;
      sumLeave += stats.leaveDays;
      sumOnDuty += stats.onDutyDays;
      sumPercentages += stats.percentage;

      return {
        _id: s._id,
        name: s.name,
        rollNumber: s.rollNumber,
        niatId: s.niatId,
        sectionName: s.section?.name || '—',
        sectionCode: s.section?.code || '—',
        universityName: s.university?.name || '—',
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        studentPhone: s.studentPhone || '',
        workingDays: stats.workingDays,
        presentDays: stats.presentDays,
        absentDays: stats.absentDays,
        lateDays: stats.lateDays,
        leaveDays: stats.leaveDays,
        onDutyDays: stats.onDutyDays,
        percentage: stats.percentage,
        statusTier:
          stats.percentage >= 85 ? 'Excellent' : stats.percentage >= 75 ? 'Good' : 'Shortage',
      };
    });

    const totalStudents = students.length;
    const avgPercentage =
      totalStudents > 0
        ? Math.round((sumPercentages / totalStudents) * 100) / 100
        : 0;

    return {
      summary: {
        totalStudents,
        workingDays: totalWorkingDays,
        totalPresent: sumPresent,
        totalAbsent: sumAbsent,
        totalLate: sumLate,
        totalLeave: sumLeave,
        totalOnDuty: sumOnDuty,
        averagePercentage: avgPercentage,
      },
      students: studentList,
      dateRange: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      meta: {
        reportType,
        monthName: MONTH_NAMES[m - 1],
        year: y,
        studentCount: totalStudents,
      },
    };
  },
};

module.exports = reportService;

/**
 * Normalizes any Date or date string to midnight UTC (YYYY-MM-DD 00:00:00.000Z)
 * Ensures consistency across day lookups and prevents timezone offset collisions.
 * @param {string|Date} dateInput
 * @returns {Date} Normalized Date object
 */
const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

/**
 * Checks whether a given day type counts as an institutional working day.
 * - working_day: YES
 * - online_class: YES (counts as working day with student attendance)
 * - sunday: NO
 * - holiday: NO
 * @param {string} dayType
 * @returns {boolean}
 */
const isWorkingDayType = (dayType) => {
  return dayType === 'working_day' || dayType === 'online_class';
};

/**
 * Reusable attendance metrics calculator.
 * Strictly adheres to institutional formula:
 * Attendance Percentage = ((Present Days + Late Days) / Working Days) * 100
 * Working Days = Total Days - Sundays - Holidays
 * Late counts as attended but remains separately visible.
 * Leave & On-Duty are tracked distinctly.
 * 
 * @param {Object} counts
 * @returns {Object} Calculated metrics
 */
const calculateAttendanceStats = ({
  workingDays = 0,
  presentDays = 0,
  absentDays = 0,
  lateDays = 0,
  leaveDays = 0,
  onDutyDays = 0,
  holidays = 0,
  sundays = 0,
}) => {
  const effectiveWorkingDays = Number(workingDays) || 0;
  const effectivePresentDays = Number(presentDays) || 0;
  const effectiveLateDays = Number(lateDays) || 0;

  let percentage = 0;
  if (effectiveWorkingDays > 0) {
    const attendedDays = effectivePresentDays + effectiveLateDays;
    percentage = Math.round((attendedDays / effectiveWorkingDays) * 10000) / 100;
  }

  return {
    workingDays: effectiveWorkingDays,
    presentDays: effectivePresentDays,
    absentDays: Number(absentDays) || 0,
    lateDays: effectiveLateDays,
    leaveDays: Number(leaveDays) || 0,
    onDutyDays: Number(onDutyDays) || 0,
    holidays: Number(holidays) || 0,
    sundays: Number(sundays) || 0,
    percentage: Math.min(100, Math.max(0, percentage)),
  };
};

module.exports = {
  normalizeDate,
  isWorkingDayType,
  calculateAttendanceStats,
};

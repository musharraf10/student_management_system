const mongoose = require('mongoose');

const attendanceDaySchema = new mongoose.Schema(
  {
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: [true, 'Please provide university'],
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Please provide section'],
    },
    date: {
      type: Date,
      required: [true, 'Please provide date'],
    },
    dayType: {
      type: String,
      enum: ['working_day', 'online_class', 'sunday', 'holiday'],
      required: [true, 'Please select day type'],
      default: 'working_day',
    },
    holidayReason: {
      type: String,
      trim: true,
      default: '',
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
    },
    lateCount: {
      type: Number,
      default: 0,
    },
    leaveCount: {
      type: Number,
      default: 0,
    },
    onDutyCount: {
      type: Number,
      default: 0,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['submitted', 'draft'],
      default: 'submitted',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance for the same section and date
attendanceDaySchema.index({ section: 1, date: 1 }, { unique: true });
attendanceDaySchema.index({ university: 1, date: 1 });

const AttendanceDay = mongoose.model('AttendanceDay', attendanceDaySchema);

module.exports = AttendanceDay;

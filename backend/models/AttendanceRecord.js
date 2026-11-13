const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    attendanceDay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceDay',
      required: true,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'leave', 'on_duty'],
      required: true,
      default: 'present',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// One record per student per section per date
attendanceRecordSchema.index({ section: 1, date: 1, student: 1 }, { unique: true });
attendanceRecordSchema.index({ student: 1, date: 1 });
attendanceRecordSchema.index({ attendanceDay: 1 });

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

module.exports = AttendanceRecord;

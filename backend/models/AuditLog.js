const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
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
    },
    attendanceDay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceDay',
      required: false,
    },
    attendanceDate: {
      type: Date,
      required: false,
    },
    previousStatus: {
      type: String,
      default: 'none',
    },
    newStatus: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: ['create', 'update', 'status_change', 'bulk_mark', 'student_deactivate', 'student_restore'],
      default: 'status_change',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ section: 1, attendanceDate: 1 });
auditLogSchema.index({ student: 1 });
auditLogSchema.index({ updatedBy: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: [true, 'Please provide roll number (Chalapathi Roll Number)'],
      trim: true,
    },
    niatId: {
      type: String,
      required: [true, 'Please provide NIAT ID'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide student name'],
      trim: true,
    },
    parentName: {
      type: String,
      required: [true, 'Please provide parent name'],
      trim: true,
    },
    parentPhone: {
      type: String,
      required: [true, 'Please provide parent phone number'],
      trim: true,
    },
    studentPhone: {
      type: String,
      trim: true,
      default: '',
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: [true, 'Please assign a university'],
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Please assign a section'],
    },
    academicYear: {
      type: String,
      required: [true, 'Please specify academic year'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    attendanceStartDate: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure NIAT ID is unique per university
studentSchema.index({ university: 1, niatId: 1 }, { unique: true });
// Compound index for roll number per university and section
studentSchema.index({ university: 1, section: 1, rollNumber: 1 });
studentSchema.index({ section: 1, status: 1 });
studentSchema.index({ university: 1, status: 1 });
studentSchema.index({ section: 1, attendanceStartDate: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;

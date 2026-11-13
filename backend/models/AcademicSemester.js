const mongoose = require('mongoose');

const academicSemesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide semester name'],
      trim: true,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: [true, 'Please associate semester with a university'],
    },
    academicYear: {
      type: String,
      required: [true, 'Please specify academic year'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide semester start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide semester end date'],
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

academicSemesterSchema.index({ university: 1, academicYear: 1 });

const AcademicSemester = mongoose.model('AcademicSemester', academicSemesterSchema);

module.exports = AcademicSemester;

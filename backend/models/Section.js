const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide section name'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide section code'],
      uppercase: true,
      trim: true,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: [true, 'Please assign a university to the section'],
    },
    academicYear: {
      type: String,
      required: [true, 'Please specify academic year (e.g., 2025-2026)'],
      trim: true,
    },
    semester: {
      type: String,
      required: [true, 'Please specify semester (e.g., Semester 1)'],
      trim: true,
    },
    assignedCoaches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness of section name within a university for an academic year
sectionSchema.index({ university: 1, name: 1, academicYear: 1 }, { unique: true });
sectionSchema.index({ code: 1 });

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;

const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide university name'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide university code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Please provide university location'],
      trim: true,
    },
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

// Index for efficient search and filtering
universitySchema.index({ code: 1, status: 1 });

const University = mongoose.model('University', universitySchema);

module.exports = University;

const mongoose = require('mongoose');

const CheckInRequestSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  type: {
    type: String,
    enum: ['CHECK_IN', 'CHECK_OUT'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String
  },
  damageReport: {
    hasDamage: {
      type: Boolean,
      default: false
    },
    description: String,
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date
}, {
  timestamps: true
});

CheckInRequestSchema.index({ bookingId: 1, type: 1 });
CheckInRequestSchema.index({ status: 1 });
CheckInRequestSchema.index({ userId: 1 });

module.exports = mongoose.model('CheckInRequest', CheckInRequestSchema);

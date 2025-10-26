const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facilities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  }],
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PENDING_ADMIN', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED'],
    default: 'PENDING'
  },
  approval: {
    type: {
      type: String,
      enum: ['AUTO', 'MANUAL']
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    at: Date,
    notes: String
  },
  isExternal: {
    type: Boolean,
    default: false
  },
  externalOrg: String,
  checkInCode: {
    type: String,
    default: () => nanoid(8)
  },
  qrCodeUrl: String,
  checkInAt: Date,
  checkOutAt: Date,
  notifications: [{
    type: {
      type: String,
      enum: ['REMINDER_START', 'REMINDER_END', 'OVERDUE', 'ADMIN_DIGEST']
    },
    sentAt: Date,
    channel: {
      type: String,
      enum: ['EMAIL', 'SMS']
    },
    success: Boolean
  }],
  audit: [{
    action: String,
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    at: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for conflict detection and performance
BookingSchema.index({ startTime: 1, endTime: 1, facilities: 1 });
BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
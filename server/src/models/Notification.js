const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  type: {
    type: String,
    enum: [
      'BOOKING_CONFIRMED',
      'BOOKING_APPROVED', 
      'BOOKING_REJECTED',
      'REMINDER_START',
      'REMINDER_END',
      'OVERDUE',
      'CHECK_IN_REMINDER',
      'FEEDBACK_REQUEST',
      'ADMIN_DIGEST'
    ],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  channel: {
    type: String,
    enum: ['EMAIL', 'SMS', 'IN_APP'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'READ'],
    default: 'PENDING'
  },
  scheduledFor: Date,
  sentAt: Date,
  readAt: Date,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  error: {
    code: String,
    message: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Indexes
NotificationSchema.index({ userId: 1, status: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
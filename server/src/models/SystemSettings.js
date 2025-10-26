const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  autoApprovalEnabled: {
    type: Boolean,
    default: true
  },
  reminderBeforeStartMinutes: {
    type: Number,
    default: 30,
    min: 5,
    max: 1440
  },
  reminderBeforeEndMinutes: {
    type: Number,
    default: 10,
    min: 5,
    max: 60
  },
  overdueGraceMinutes: {
    type: Number,
    default: 5,
    min: 0,
    max: 60
  },
  externalBookingsEnabled: {
    type: Boolean,
    default: true
  },
  restrictedTypes: [{
    type: String,
    enum: ['PROJECTOR', 'LAB', 'BUS', 'HOSTEL', 'HALL', 'CLASSROOM', 'CONFERENCE_ROOM']
  }],
  dailyBookingLimitPerUser: {
    type: Number,
    min: 1,
    max: 20
  },
  allowedExternalWindowDays: {
    type: Number,
    default: 180,
    min: 7,
    max: 365
  },
  emailNotificationsEnabled: {
    type: Boolean,
    default: true
  },
  smsNotificationsEnabled: {
    type: Boolean,
    default: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
SystemSettingsSchema.index({}, { unique: true });

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
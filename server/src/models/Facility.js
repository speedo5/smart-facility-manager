const mongoose = require('mongoose');

const FacilitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Facility name is required'],
    trim: true,
    maxlength: [100, 'Facility name cannot exceed 100 characters']
  },
  imageUrl: {
    type: String,
    default: null
  },
  qrCodeImageUrl: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['PROJECTOR', 'LAB', 'BUS', 'HOSTEL', 'HALL', 'CLASSROOM', 'CONFERENCE_ROOM', 'EQUIPMENT', 'VEHICLE'],
    required: [true, 'Facility type is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1'],
    max: [1000, 'Capacity cannot exceed 1000']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Access Control
  isRestricted: {
    type: Boolean,
    default: false
  },
  allowedRoles: {
    type: [String],
    enum: ['STUDENT', 'STAFF', 'ADMIN', 'EXTERNAL'],
    default: ['STUDENT', 'STAFF', 'ADMIN']
  },
  
  // QR Code Settings
  qrEnabled: {
    type: Boolean,
    default: false
  },
  
  // Booking Rules
  minBookingMinutes: {
    type: Number,
    required: [true, 'Minimum booking duration is required'],
    min: [15, 'Minimum booking duration must be at least 15 minutes'],
    default: 30
  },
  maxBookingMinutes: {
    type: Number,
    required: [true, 'Maximum booking duration is required'],
    min: [30, 'Maximum booking duration must be at least 30 minutes'],
    default: 480 // 8 hours
  },
  bufferMinutesBetween: {
    type: Number,
    default: 15,
    min: [0, 'Buffer time cannot be negative'],
    max: [120, 'Buffer time cannot exceed 2 hours']
  },
  
  // Availability for external bookings
  externalBookingEnabled: {
    type: Boolean,
    default: false
  },
  availabilityStart: {
    type: Date // Starting date when this facility becomes available for external bookings
  },
  availabilityEnd: {
    type: Date // End date for external booking availability
  },
  
  // Facility Status
  active: {
    type: Boolean,
    default: true
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceNotes: String,
  
  // Pricing (for external bookings)
  hourlyRate: {
    type: Number,
    default: 0,
    min: [0, 'Hourly rate cannot be negative']
  },
  
  // Additional features
  features: [{
    type: String,
    trim: true
  }],
  equipment: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    condition: { type: String, enum: ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_REPAIR'], default: 'GOOD' }
  }],
  
  // Contact and Management
  contactPerson: {
    name: String,
    phone: String,
    email: String
  },

  // Facility Code - unique identifier
  facilityCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Usage statistics
  stats: {
    totalBookings: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    lastBooked: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
FacilitySchema.index({ type: 1, active: 1 });
FacilitySchema.index({ location: 1 });
FacilitySchema.index({ isRestricted: 1 });
FacilitySchema.index({ externalBookingEnabled: 1, availabilityStart: 1, availabilityEnd: 1 });
FacilitySchema.index({ createdAt: -1 });
FacilitySchema.index({ 'stats.averageRating': -1 });

// Virtuals
FacilitySchema.virtual('isAvailable').get(function() {
  return this.active && !this.maintenanceMode;
});

FacilitySchema.virtual('isExternalBookingAvailable').get(function() {
  if (!this.externalBookingEnabled || !this.isAvailable) return false;
  
  const now = new Date();
  const startAvailable = !this.availabilityStart || this.availabilityStart <= now;
  const endAvailable = !this.availabilityEnd || this.availabilityEnd >= now;
  
  return startAvailable && endAvailable;
});

FacilitySchema.virtual('bookingDurationRange').get(function() {
  return {
    min: this.minBookingMinutes,
    max: this.maxBookingMinutes,
    buffer: this.bufferMinutesBetween
  };
});

// Methods
FacilitySchema.methods.canUserBook = function(userRole) {
  if (!this.isAvailable) return false;
  return this.allowedRoles.includes(userRole);
};

FacilitySchema.methods.updateStats = function(bookingDurationMinutes, rating = null) {
  this.stats.totalBookings += 1;
  this.stats.totalHours += bookingDurationMinutes / 60;
  this.stats.lastBooked = new Date();
  
  if (rating !== null) {
    // Simple average calculation - could be improved with weighted average
    const currentTotal = this.stats.averageRating * (this.stats.totalBookings - 1);
    this.stats.averageRating = (currentTotal + rating) / this.stats.totalBookings;
  }
  
  return this.save();
};

// Static methods
FacilitySchema.statics.findAvailable = function(userRole = null) {
  const query = { active: true, maintenanceMode: false };
  
  if (userRole) {
    query.allowedRoles = { $in: [userRole] };
  }
  
  return this.find(query);
};

FacilitySchema.statics.findByType = function(type) {
  return this.find({ type, active: true });
};

FacilitySchema.statics.findForExternalBooking = function() {
  const now = new Date();
  return this.find({
    active: true,
    externalBookingEnabled: true,
    $or: [
      { availabilityStart: { $exists: false } },
      { availabilityStart: { $lte: now } }
    ],
    $or: [
      { availabilityEnd: { $exists: false } },
      { availabilityEnd: { $gte: now } }
    ]
  });
};

// Pre-save middleware
FacilitySchema.pre('save', function(next) {
  // Ensure min booking time is less than max
  if (this.minBookingMinutes >= this.maxBookingMinutes) {
    return next(new Error('Minimum booking duration must be less than maximum duration'));
  }
  
  // Update the updatedBy field if it's not a new document
  if (!this.isNew && this.isModified() && this.updatedBy) {
    this.updatedAt = Date.now();
  }
  
  // Generate facilityCode if not provided
  if (!this.facilityCode) {
    const base = this.name ? this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'facility';
    const timestamp = Date.now().toString(36).slice(-6);
    this.facilityCode = `${base}-${timestamp}`;
  }
  
  next();
});

// Validation for availability dates
FacilitySchema.pre('save', function(next) {
  if (this.availabilityStart && this.availabilityEnd) {
    if (this.availabilityStart >= this.availabilityEnd) {
      return next(new Error('Availability start date must be before end date'));
    }
  }
  next();
});

module.exports = mongoose.model('Facility', FacilitySchema);
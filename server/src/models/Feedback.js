const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
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
  facilities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  }],
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: ['FACILITY', 'SERVICE', 'OVERALL'],
    default: 'OVERALL'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'RESOLVED'],
    default: 'PENDING'
  },
  adminResponse: {
    message: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Indexes
FeedbackSchema.index({ bookingId: 1 });
FeedbackSchema.index({ userId: 1 });
FeedbackSchema.index({ facilities: 1 });
FeedbackSchema.index({ rating: 1 });
FeedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', FeedbackSchema);
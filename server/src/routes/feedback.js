const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');

// POST /api/feedback - Submit feedback for a booking
router.post('/', auth, async (req, res) => {
  try {
    const { bookingId, rating, comment, category, isAnonymous } = req.body;

    // Verify booking exists and belongs to user (or allow if anonymous)
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    // Check if booking is completed
    if (booking.status !== 'CHECKED_OUT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Feedback can only be submitted for completed bookings' 
      });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ bookingId, userId: req.user.id });
    if (existingFeedback) {
      return res.status(400).json({ 
        success: false, 
        message: 'Feedback already submitted for this booking' 
      });
    }

    const feedback = new Feedback({
      bookingId,
      userId: req.user.id,
      facilities: booking.facilities,
      rating,
      comment,
      category: category || 'OVERALL',
      isAnonymous: isAnonymous || false
    });

    await feedback.save();

    await feedback.populate([
      { path: 'bookingId', select: 'startTime endTime' },
      { path: 'facilities', select: 'name type location' },
      { path: 'userId', select: 'fullName email' }
    ]);

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/feedback/my - Get user's feedback
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const feedback = await Feedback.find({ userId: req.user.id })
      .populate('bookingId', 'startTime endTime')
      .populate('facilities', 'name type location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      data: feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/feedback - Get all feedback (ADMIN only)
router.get('/', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { 
      facility, 
      rating, 
      category, 
      status, 
      page = 1, 
      limit = 20,
      startDate,
      endDate 
    } = req.query;
    
    const query = {};
    
    if (facility) query.facilities = facility;
    if (rating) query.rating = parseInt(rating);
    if (category) query.category = category;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const feedback = await Feedback.find(query)
      .populate('bookingId', 'startTime endTime')
      .populate('facilities', 'name type location')
      .populate('userId', 'fullName email role')
      .populate('adminResponse.respondedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      data: feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/feedback/:id/respond - Respond to feedback (ADMIN only)
router.patch('/:id/respond', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Response message is required' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    feedback.adminResponse = {
      message,
      respondedBy: req.user.id,
      respondedAt: new Date()
    };
    feedback.status = 'REVIEWED';

    await feedback.save();

    await feedback.populate([
      { path: 'bookingId', select: 'startTime endTime' },
      { path: 'facilities', select: 'name type location' },
      { path: 'userId', select: 'fullName email' },
      { path: 'adminResponse.respondedBy', select: 'fullName email' }
    ]);

    // TODO(INTEGRATION:EMAIL): Send response email to user
    // if (!feedback.isAnonymous) {
    //   await emailService.sendFeedbackResponse(feedback.userId.email, feedback);
    // }

    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/feedback/stats - Get feedback statistics (ADMIN only)
router.get('/stats', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { facility, startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (facility) matchQuery.facilities = mongoose.Types.ObjectId(facility);
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalFeedback: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          ratingDistribution: {
            $push: {
              $switch: {
                branches: [
                  { case: { $eq: ['$rating', 1] }, then: '1' },
                  { case: { $eq: ['$rating', 2] }, then: '2' },
                  { case: { $eq: ['$rating', 3] }, then: '3' },
                  { case: { $eq: ['$rating', 4] }, then: '4' },
                  { case: { $eq: ['$rating', 5] }, then: '5' }
                ]
              }
            }
          }
        }
      }
    ]);

    // Get rating distribution counts
    const ratingCounts = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get category distribution
    const categoryStats = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || { totalFeedback: 0, averageRating: 0 },
        ratingDistribution: ratingCounts,
        categoryBreakdown: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
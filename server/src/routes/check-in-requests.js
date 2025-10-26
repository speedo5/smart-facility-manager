const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const CheckInRequest = require('../models/CheckInRequest');
const Booking = require('../models/Booking');
const Facility = require('../models/Facility');

// GET /api/check-in-requests - Get all requests (ADMIN/STAFF)
router.get('/', auth, requireRole(['ADMIN', 'STAFF']), async (req, res) => {
  try {
    const { status, type } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    
    const requests = await CheckInRequest.find(query)
      .populate('userId', 'fullName email')
      .populate('facilityId', 'name type location')
      .populate('bookingId')
      .populate('processedBy', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/check-in-requests/my - Get user's own requests
router.get('/my', auth, async (req, res) => {
  try {
    const requests = await CheckInRequest.find({ userId: req.user.id })
      .populate('facilityId', 'name type location')
      .populate('bookingId')
      .populate('processedBy', 'fullName email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/check-in-requests - Create check-in/out request
router.post('/', auth, async (req, res) => {
  try {
    const { bookingId, facilityId, type, feedback } = req.body;
    
    if (!bookingId || !facilityId || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking ID, facility ID, and type are required' 
      });
    }
    
    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Check if request already exists
    const existingRequest = await CheckInRequest.findOne({
      bookingId,
      type,
      status: 'PENDING'
    });
    
    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        message: 'A pending request already exists for this action' 
      });
    }
    
    const request = new CheckInRequest({
      bookingId,
      userId: req.user.id,
      facilityId,
      type,
      feedback: type === 'CHECK_OUT' ? feedback : undefined
    });
    
    await request.save();
    
    await request.populate('facilityId', 'name type location');
    await request.populate('bookingId');
    
    res.status(201).json({ 
      success: true, 
      data: request,
      message: `${type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} request submitted successfully` 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/check-in-requests/:id/approve - Approve request (ADMIN/STAFF)
router.patch('/:id/approve', auth, requireRole(['ADMIN', 'STAFF']), async (req, res) => {
  try {
    const { damageReport } = req.body;
    
    const request = await CheckInRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending requests can be approved' 
      });
    }
    
    // Update booking status
    const booking = await Booking.findById(request.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    const now = new Date();
    
    if (request.type === 'CHECK_IN') {
      booking.status = 'CHECKED_IN';
      booking.checkInAt = now;
      booking.audit.push({
        action: 'MANUAL_CHECK_IN',
        by: req.user.id,
        at: now
      });
    } else {
      booking.status = 'CHECKED_OUT';
      booking.checkOutAt = now;
      booking.audit.push({
        action: 'MANUAL_CHECK_OUT',
        by: req.user.id,
        at: now
      });
    }
    
    await booking.save();
    
    // Update request
    request.status = 'APPROVED';
    request.processedBy = req.user.id;
    request.processedAt = now;
    
    if (damageReport) {
      request.damageReport = {
        ...damageReport,
        reportedBy: req.user.id
      };
    }
    
    await request.save();
    
    await request.populate('userId', 'fullName email');
    await request.populate('facilityId', 'name type location');
    await request.populate('bookingId');
    
    res.json({ 
      success: true, 
      data: request,
      message: `${request.type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} approved successfully` 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/check-in-requests/:id/reject - Reject request (ADMIN/STAFF)
router.patch('/:id/reject', auth, requireRole(['ADMIN', 'STAFF']), async (req, res) => {
  try {
    const request = await CheckInRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending requests can be rejected' 
      });
    }
    
    request.status = 'REJECTED';
    request.processedBy = req.user.id;
    request.processedAt = new Date();
    
    await request.save();
    
    await request.populate('userId', 'fullName email');
    await request.populate('facilityId', 'name type location');
    
    res.json({ 
      success: true, 
      data: request,
      message: 'Request rejected successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { auth, requireRole } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Facility = require('../models/Facility');
const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

// GET /api/bookings - Get all bookings with filters
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      facilityId, 
      startDate, 
      endDate, 
      isExternal,
      all = 'false', // admin parameter to override user filtering
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};
    
    // Admin with all=true sees everything, otherwise users see their own bookings
    if (!(req.user.role === 'ADMIN' && all === 'true')) {
      query.userId = req.user.id;
    }
    
    // Apply filters
    if (status) query.status = status;
    if (facilityId) query.facilities = facilityId;
    if (isExternal !== undefined) query.isExternal = isExternal === 'true';
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const bookings = await Booking.find(query)
      .populate('userId', '-hashedPassword')
      .populate('facilities')
      .populate('approval.by', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
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

// POST /api/bookings - Create a new booking
router.post('/', auth, async (req, res) => {
  try {
    const { facilityIds, startTime, endTime, isExternal, externalOrg } = req.body;

    // Validate input
    if (!facilityIds || !startTime || !endTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Facility IDs, start time, and end time are required' 
      });
    }

    // Validate facilities exist
    const facilities = await Facility.find({ _id: { $in: facilityIds }, active: true });
    if (facilities.length !== facilityIds.length) {
      return res.status(404).json({ success: false, message: 'One or more facilities not found or inactive' });
    }

    // Check for conflicts
    const conflicts = await Booking.find({
      facilities: { $in: facilityIds },
      status: { $nin: ['REJECTED', 'CANCELLED', 'EXPIRED'] },
      $or: [
        { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } }
      ]
    });

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Facility is already booked during this time slot' 
      });
    }

    // Auto-approval policy extended with capacity awareness:
    // - If any selected facility is restricted -> require manual admin approval (PENDING_ADMIN)
    // - If booking is external -> require manual admin approval (PENDING_ADMIN)
    // - If all instances of any requested facility TYPE are already booked for the requested interval -> require manual approval
    // - Otherwise auto-approve
    const hasRestrictedFacility = facilities.some(f => f.isRestricted);
    let requiresAdminApproval = hasRestrictedFacility || isExternal;

    // Capacity check by facility type: for each type among the selected facilities,
    // if every facility of that type is already reserved in the requested time window
    // then require admin approval. This ensures auto-approval only works while there
    // are spare instances for the requested type.
    if (!requiresAdminApproval) {
      const types = [...new Set(facilities.map(f => f.type))];
      for (const type of types) {
        // Find all active facilities of this type
        const facilitiesOfType = await Facility.find({ type, active: true, maintenanceMode: false }).select('_id');
        if (!facilitiesOfType || facilitiesOfType.length === 0) continue; // nothing to check

        const facilityIdsOfType = facilitiesOfType.map(f => f._id.toString());

        // Find overlapping bookings that reserve any facility of this type
        const overlapping = await Booking.find({
          facilities: { $in: facilityIdsOfType },
          status: { $nin: ['REJECTED', 'CANCELLED', 'EXPIRED'] },
          $or: [
            { startTime: { $lt: new Date(endTime) }, endTime: { $gt: new Date(startTime) } }
          ]
        }).select('facilities');

        // Collect unique facility ids already booked in the interval
        const bookedSet = new Set();
        overlapping.forEach(b => {
          (b.facilities || []).forEach(fid => {
            const idStr = fid.toString();
            if (facilityIdsOfType.includes(idStr)) bookedSet.add(idStr);
          });
        });

        // If all facilities of this type are already booked, require admin approval
        if (bookedSet.size >= facilityIdsOfType.length) {
          requiresAdminApproval = true;
          break;
        }
      }
    }

    const autoApprove = !requiresAdminApproval;

    // Create booking
    const booking = new Booking({
      userId: req.user.id,
      facilities: facilityIds,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: autoApprove ? 'APPROVED' : 'PENDING_ADMIN',
      isExternal: isExternal || false,
      externalOrg: externalOrg
    });

    if (autoApprove) {
      booking.approval = {
        type: 'AUTO',
        at: new Date()
      };
    }

    // Generate QR code for each facility
    const qrData = JSON.stringify({
      bookingId: booking._id,
      checkInCode: booking.checkInCode,
      facilities: facilityIds,
      type: 'FACILITY_ACCESS'
    });
    
    booking.qrCodeUrl = await QRCode.toDataURL(qrData);

    await booking.save();

    // Populate response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', '-hashedPassword')
      .populate('facilities');

    // Add audit trail
    booking.audit.push({
      action: 'BOOKING_CREATED',
      by: req.user.id,
      at: new Date()
    });
    await booking.save();

    res.status(201).json({ 
      success: true, 
      data: populatedBooking,
      message: autoApprove ? 'Booking created and approved automatically' : 'Booking created successfully'
    });
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

// PATCH /api/bookings/:id/approve - Approve booking (ADMIN only)
router.patch('/:id/approve', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { notes } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'PENDING_ADMIN' && booking.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending bookings can be approved' 
      });
    }

    booking.status = 'APPROVED';
    booking.approval = {
      type: 'MANUAL',
      by: req.user.id,
      at: new Date(),
      notes: notes
    };

    // Generate QR code if not already generated
    if (!booking.qrCodeUrl) {
      const qrData = JSON.stringify({
        bookingId: booking._id,
        checkInCode: booking.checkInCode,
        facilities: booking.facilities,
        type: 'FACILITY_ACCESS'
      });
      
      booking.qrCodeUrl = await QRCode.toDataURL(qrData);
    }

    booking.audit.push({
      action: 'BOOKING_APPROVED',
      by: req.user.id,
      at: new Date()
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', '-hashedPassword')
      .populate('facilities')
      .populate('approval.by', 'fullName email');

    res.json({ success: true, data: populatedBooking, message: 'Booking approved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/bookings/:id/reject - Reject booking (ADMIN only)
router.patch('/:id/reject', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { notes } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'REJECTED';
    booking.approval = {
      type: 'MANUAL',
      by: req.user.id,
      at: new Date(),
      notes: notes
    };

    booking.audit.push({
      action: 'BOOKING_REJECTED',
      by: req.user.id,
      at: new Date()
    });

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', '-hashedPassword')
      .populate('facilities')
      .populate('approval.by', 'fullName email');

    res.json({ success: true, data: populatedBooking, message: 'Booking rejected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/bookings/:id/cancel - Cancel booking
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { notes } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Users can only cancel their own bookings
    if (req.user.role !== 'ADMIN' && booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel booking that is already checked in or out' 
      });
    }

    booking.status = 'CANCELLED';
    booking.audit.push({
      action: 'BOOKING_CANCELLED',
      by: req.user.id,
      at: new Date()
    });

    if (notes) {
      if (!booking.approval) {
        booking.approval = { type: 'MANUAL' };
      }
      booking.approval.notes = notes;
    }

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', '-hashedPassword')
      .populate('facilities');

    res.json({ success: true, data: populatedBooking, message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/bookings/:id - Delete booking (ADMIN only)
router.delete('/:id', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/:id - Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', '-hashedPassword')
      .populate('facilities')
      .populate('approval.by', 'fullName email');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Users can only view their own bookings unless they're admin
    if (req.user.role !== 'ADMIN' && booking.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');
const Booking = require('../models/Booking');

// POST /api/qr-scanner/scan - Process QR code scan
router.post('/scan', auth, requireRole(['ADMIN', 'STAFF']), async (req, res) => {
  try {
    const { qrData, manualCode } = req.body;
    
    let checkInCode, bookingId;
    
    if (qrData) {
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type !== 'FACILITY_ACCESS') {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid QR code type' 
          });
        }
        checkInCode = parsed.checkInCode;
        bookingId = parsed.bookingId;
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid QR code format' 
        });
      }
    } else if (manualCode) {
      checkInCode = manualCode.toUpperCase();
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'QR data or manual code required' 
      });
    }

    // Find booking by check-in code
    const query = { checkInCode };
    if (bookingId) {
      query._id = bookingId;
    }
    
    const booking = await Booking.findOne(query)
      .populate('facilities', 'name type location')
      .populate('userId', 'fullName email');
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Invalid or expired check-in code' 
      });
    }

    // Check booking status and timing
    if (!['APPROVED', 'CHECKED_IN'].includes(booking.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking is not approved for check-in' 
      });
    }

    const now = new Date();
    const checkInStart = new Date(booking.startTime.getTime() - 30 * 60 * 1000); // 30 min before
    const checkInEnd = new Date(booking.endTime.getTime() + 30 * 60 * 1000); // 30 min after end

    if (now < checkInStart) {
      return res.status(400).json({ 
        success: false, 
        message: 'Check-in is only allowed 30 minutes before booking start time' 
      });
    }

    if (now > checkInEnd) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking has expired. Check-in no longer allowed.' 
      });
    }

    let action, newStatus;
    
    if (booking.status === 'APPROVED') {
      // Check in
      action = 'checkin';
      newStatus = 'CHECKED_IN';
      booking.checkInAt = now;
    } else if (booking.status === 'CHECKED_IN') {
      // Check out
      action = 'checkout';
      newStatus = 'CHECKED_OUT';
      booking.checkOutAt = now;
    }

    booking.status = newStatus;
    
    // Add audit trail
    booking.audit.push({
      action: `QR_${action.toUpperCase()}`,
      by: req.user.id,
      at: now
    });

    await booking.save();

    res.json({ 
      success: true, 
      data: {
        action,
        booking: {
          id: booking._id,
          user: booking.userId.fullName,
          facilities: booking.facilities.map(f => f.name),
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          checkInAt: booking.checkInAt,
          checkOutAt: booking.checkOutAt
        },
        timestamp: now.toISOString()
      }
    });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/qr-scanner/booking/:code - Get booking info by check-in code
router.get('/booking/:code', auth, requireRole(['ADMIN', 'STAFF']), async (req, res) => {
  try {
    const booking = await Booking.findOne({ checkInCode: req.params.code.toUpperCase() })
      .populate('facilities', 'name type location')
      .populate('userId', 'fullName email');
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
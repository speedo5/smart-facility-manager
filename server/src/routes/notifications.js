const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    
    const filter = { userId: req.user._id };
    if (status) {
      filter.status = status;
    }
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('bookingId', 'facilities startTime endTime');
    
    const total = await Notification.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 
        status: 'READ',
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, status: { $ne: 'READ' } },
      { 
        status: 'READ',
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
});

// Create notification (admin only)
router.post('/', 
  auth,
  [
    body('userId').isMongoId().withMessage('Valid user ID required'),
    body('type').isIn([
      'BOOKING_CONFIRMED', 'BOOKING_APPROVED', 'BOOKING_REJECTED',
      'REMINDER_START', 'REMINDER_END', 'OVERDUE',
      'CHECK_IN_REMINDER', 'FEEDBACK_REQUEST', 'ADMIN_DIGEST'
    ]).withMessage('Valid notification type required'),
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title required (1-100 characters)'),
    body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message required (1-500 characters)'),
    body('channel').isIn(['EMAIL', 'SMS', 'IN_APP']).withMessage('Valid channel required')
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }
      
      const notification = new Notification({
        ...req.body,
        status: 'PENDING'
      });
      
      await notification.save();
      
      // TODO: Implement actual notification sending logic here
      // For now, just mark as sent
      notification.status = 'SENT';
      notification.sentAt = new Date();
      await notification.save();
      
      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create notification'
      });
    }
  }
);

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

module.exports = router;
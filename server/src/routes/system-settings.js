const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const SystemSettings = require('../models/SystemSettings');
const { logger } = require('../middleware/logger');

const router = express.Router();

// Get system settings
router.get('/', auth, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne().populate('updatedBy', 'fullName email');
    
    // Create default settings if none exist
    if (!settings) {
      settings = new SystemSettings();
      await settings.save();
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Error fetching system settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch system settings',
      error: error.message 
    });
  }
});

// Update system settings (Admin only)
router.patch('/', auth, [
  body('autoApprovalEnabled').optional().isBoolean(),
  body('reminderBeforeStartMinutes').optional().isInt({ min: 5, max: 1440 }),
  body('reminderBeforeEndMinutes').optional().isInt({ min: 5, max: 60 }),
  body('overdueGraceMinutes').optional().isInt({ min: 0, max: 60 }),
  body('externalBookingsEnabled').optional().isBoolean(),
  body('restrictedTypes').optional().isArray(),
  body('restrictedTypes.*').optional().isIn(['PROJECTOR', 'LAB', 'BUS', 'HOSTEL', 'HALL', 'CLASSROOM', 'CONFERENCE_ROOM']),
  body('dailyBookingLimitPerUser').optional().isInt({ min: 1, max: 20 }),
  body('allowedExternalWindowDays').optional().isInt({ min: 7, max: 365 }),
  body('emailNotificationsEnabled').optional().isBoolean(),
  body('smsNotificationsEnabled').optional().isBoolean()
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings();
    }

    // Update settings
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    });

    settings.updatedBy = req.user.id;
    await settings.save();
    await settings.populate('updatedBy', 'fullName email');

    logger.info(`System settings updated by user ${req.user.id}`);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Error updating system settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update system settings',
      error: error.message 
    });
  }
});

// Reset to default settings (Admin only)
router.post('/reset', auth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin role required.' 
      });
    }

    await SystemSettings.deleteMany({});
    
    const defaultSettings = new SystemSettings({
      updatedBy: req.user.id
    });
    await defaultSettings.save();
    await defaultSettings.populate('updatedBy', 'fullName email');

    logger.info(`System settings reset to defaults by user ${req.user.id}`);
    res.json({ 
      success: true, 
      data: defaultSettings,
      message: 'Settings reset to defaults successfully'
    });
  } catch (error) {
    logger.error('Error resetting system settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset system settings',
      error: error.message 
    });
  }
});

module.exports = router;
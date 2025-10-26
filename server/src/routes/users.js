const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { auth, requireRole } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users - Get all users (ADMIN only)
router.get('/', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { 
      role, 
      status, 
      isVerified, 
      page = 1, 
      limit = 20,
      search 
    } = req.query;

    const query = {};
    
    // Apply filters
    if (role) query.role = role;
    if (status) query.status = status;
    if (isVerified !== undefined) query.isVerified = isVerified === 'true';
    
    if (search) {
      query.$or = [
        { fullName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .select('-hashedPassword')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
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

// GET /api/users/:id - Get user by ID (ADMIN or own profile)
router.get('/:id', auth, async (req, res) => {
  try {
    // Allow users to view their own profile or admins to view any profile
    if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(req.params.id).select('-hashedPassword');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/users/:id - Update user (ADMIN or own profile)
router.patch('/:id', auth, async (req, res) => {
  try {
    // Allow users to update their own profile or admins to update any profile
    if (req.user.id !== req.params.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fields that only admins can update
    const adminOnlyFields = ['role', 'isVerified', 'status', 'verifiedBy', 'verifiedAt'];
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        // Check if non-admin is trying to update admin-only fields
        if (req.user.role !== 'ADMIN' && adminOnlyFields.includes(key)) {
          return; // Skip admin-only fields for non-admins
        }
        
        if (key === 'hashedPassword') {
          // Hash new password
          user.hashedPassword = req.body[key];
        } else if (key === 'studentId' || key === 'staffId') {
          // Handle empty strings for IDs by setting to undefined
          user[key] = req.body[key] || undefined;
        } else {
          user[key] = req.body[key];
        }
      }
    });

    // If admin is verifying user
    if (req.user.role === 'ADMIN' && req.body.isVerified === true && !user.isVerified) {
      user.verifiedBy = req.user.id;
      user.verifiedAt = new Date();
    }

    await user.save();

    // Return user without password
    const userResponse = user.toJSON();
    
    res.json({ success: true, data: userResponse });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.code === 11000) {
      // Handle duplicate key errors
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        success: false, 
        message: `${field} already exists`,
        error: 'DuplicateKeyError',
        field: field
      });
    }

    console.error('Error updating user:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.id,
      updateData: req.body
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating user',
      detail: error.message 
    });
  }
});

// DELETE /api/users/:id - Delete user (ADMIN only)
router.delete('/:id', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete by setting status to SUSPENDED
    user.status = 'SUSPENDED';
    await user.save();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users/:id/verify - Verify user (ADMIN only)
router.post('/:id/verify', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isVerified = true;
    user.status = 'ACTIVE';
    user.verifiedBy = req.user.id;
    user.verifiedAt = new Date();
    
    await user.save();

    // TODO(INTEGRATION:EMAIL): Send verification email to user
    // await emailService.sendVerificationConfirmation(user.email, user.fullName);

    res.json({ success: true, message: 'User verified successfully', data: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users/:id/suspend - Suspend user (ADMIN only)
router.post('/:id/suspend', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'SUSPENDED';
    user.suspendedBy = req.user.id;
    user.suspendedAt = new Date();
    
    await user.save();

    res.json({ success: true, message: 'User suspended successfully', data: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users/:id/activate - Activate user (ADMIN only)
router.post('/:id/activate', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.status = 'ACTIVE';
    user.suspendedBy = undefined;
    user.suspendedAt = undefined;
    
    await user.save();

    res.json({ success: true, message: 'User activated successfully', data: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/pending/verification - Get users pending verification (ADMIN only)
router.get('/pending/verification', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const users = await User.find({ 
      isVerified: false, 
      status: 'PENDING' 
    })
    .select('-hashedPassword')
    .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
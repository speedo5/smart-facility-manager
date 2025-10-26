const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

const router = express.Router();

// TODO(INTEGRATION:API): Register endpoint
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;
    
    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }
    
    // Create user (requires admin verification)
    const user = new User({
      fullName,
      email,
      phone,
      hashedPassword: password, // Will be hashed by the model's pre-save middleware
      role,
      isVerified: false,
      status: 'PENDING'
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please wait for admin verification.',
      data: { userId: user._id }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
});

// TODO(INTEGRATION:API): Login endpoint  
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findByEmail(email);
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    if (!user.isVerified || user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Account not verified or inactive. Please contact admin.'
      });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      success: true,
      data: {
        token,
        user: user.toJSON()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

module.exports = router;
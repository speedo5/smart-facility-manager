const { body, validationResult } = require('express-validator');

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('role')
    .isIn(['STUDENT', 'STAFF', 'ADMIN', 'EXTERNAL'])
    .withMessage('Invalid role'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Facility validation rules
const validateFacility = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Facility name must be between 2 and 100 characters'),
  
  body('type')
    .isIn(['PROJECTOR', 'LAB', 'BUS', 'HOSTEL', 'HALL', 'CLASSROOM', 'CONFERENCE_ROOM', 'EQUIPMENT', 'VEHICLE'])
    .withMessage('Invalid facility type'),
  
  body('location')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  
  body('capacity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Capacity must be between 1 and 1000'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('minBookingMinutes')
    .isInt({ min: 15 })
    .withMessage('Minimum booking duration must be at least 15 minutes'),
  
  body('maxBookingMinutes')
    .isInt({ min: 30 })
    .withMessage('Maximum booking duration must be at least 30 minutes'),
  
  body('bufferMinutesBetween')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('Buffer time must be between 0 and 120 minutes'),
  
  handleValidationErrors
];

// Booking validation rules
const validateBooking = [
  body('facilityIds')
    .isArray({ min: 1 })
    .withMessage('At least one facility must be selected'),
  
  body('facilityIds.*')
    .isMongoId()
    .withMessage('Invalid facility ID'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required'),
  
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((endTime, { req }) => {
      if (new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('isExternal')
    .optional()
    .isBoolean()
    .withMessage('isExternal must be a boolean'),
  
  body('externalOrg')
    .if(body('isExternal').equals(true))
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name is required for external bookings'),
  
  handleValidationErrors
];

// Feedback validation rules
const validateFeedback = [
  body('bookingId')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  
  body('category')
    .optional()
    .isIn(['FACILITY', 'SERVICE', 'OVERALL'])
    .withMessage('Invalid feedback category'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateFacility,
  validateBooking,
  validateFeedback,
  handleValidationErrors
};
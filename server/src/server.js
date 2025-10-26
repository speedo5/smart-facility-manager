const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { logger } = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const facilityRoutes = require('./routes/facilities');
const userRoutes = require('./routes/users');
const bookingRoutes = require('./routes/bookings');
const feedbackRoutes = require('./routes/feedback');
const notificationRoutes = require('./routes/notifications');
const passwordRoutes = require('./routes/passwords');
const qrScannerRoutes = require('./routes/qr-scanner');
const systemSettingsRoutes = require('./routes/system-settings');
const checkInRequestRoutes = require('./routes/check-in-requests');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Middleware
app.use(helmet());
// Configure CORS: in development allow any origin (so mobile devices on LAN can access),
// in production use ALLOWED_ORIGINS environment variable (comma-separated list).
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
let corsOptions;
if (process.env.NODE_ENV !== 'production' && !allowedOriginsEnv) {
  // permissive during local development to make testing on phones easy
  corsOptions = { origin: true, credentials: true };
  console.log('CORS is permissive for development (allowing all origins).');
  logger.info('CORS is permissive for development (allowing all origins).');
} else {
  const allowed = allowedOriginsEnv ? allowedOriginsEnv.split(',') : ['http://localhost:5173', 'http://localhost:8080'];
  corsOptions = {
    origin: function (origin, callback) {
      // allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (allowed.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        const msg = `CORS policy: origin ${origin} not allowed`;
        return callback(new Error(msg), false);
      }
    },
    credentials: true
  };
  console.log('CORS allowed origins:', allowed);
  logger.info(`CORS allowed origins: ${allowed.join(',')}`);
}
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/passwords', passwordRoutes);
app.use('/api/qr-scanner', qrScannerRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/check-in-requests', checkInRequestRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Smart Facility Booking System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logger.info(`Server started on port ${PORT}`);
});
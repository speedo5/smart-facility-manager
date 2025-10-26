const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { auth, requireRole } = require('../middleware/auth');
const Facility = require('../models/Facility');

// GET /api/facilities - Get all facilities with filters
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      location, 
      available, 
      page = 1, 
      limit = 20,
      search,
      minCapacity,
      maxCapacity 
    } = req.query;

    const query = { active: true };
    
    // Apply filters
    if (type) query.type = type;
    if (location) query.location = new RegExp(location, 'i');
    if (available === 'true') query.maintenanceMode = false;
    if (minCapacity) query.capacity = { ...query.capacity, $gte: parseInt(minCapacity) };
    if (maxCapacity) query.capacity = { ...query.capacity, $lte: parseInt(maxCapacity) };
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const facilities = await Facility.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Facility.countDocuments(query);

    res.json({
      success: true,
      data: facilities,
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

// GET /api/facilities/:id - Get facility by ID
router.get('/:id', async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id)
      .populate('createdBy', 'fullName email');
    
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }

    res.json({ success: true, data: facility });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/facilities - Create facility (ADMIN only)
router.post('/', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const facilityData = {
      ...req.body,
      createdBy: req.user.id
    };

    const facility = new Facility(facilityData);
    
    // Generate QR code if enabled
    if (facility.qrEnabled) {
      const qrData = JSON.stringify({
        facilityId: facility._id,
        facilityName: facility.name,
        type: 'FACILITY_QR'
      });
      facility.qrCodeImageUrl = await QRCode.toDataURL(qrData);
    }
    
    await facility.save();

    await facility.populate('createdBy', 'fullName email');

    res.status(201).json({ success: true, data: facility });
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

// PATCH /api/facilities/:id - Update facility (ADMIN only)
router.patch('/:id', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }

    const wasQrEnabled = facility.qrEnabled;
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        facility[key] = req.body[key];
      }
    });

    // Generate or remove QR code based on qrEnabled status
    if (facility.qrEnabled && !wasQrEnabled) {
      const qrData = JSON.stringify({
        facilityId: facility._id,
        facilityName: facility.name,
        type: 'FACILITY_QR'
      });
      facility.qrCodeImageUrl = await QRCode.toDataURL(qrData);
    } else if (!facility.qrEnabled && wasQrEnabled) {
      facility.qrCodeImageUrl = null;
    }

    facility.updatedBy = req.user.id;
    await facility.save();

    await facility.populate('createdBy', 'fullName email');

    res.json({ success: true, data: facility });
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

// DELETE /api/facilities/:id - Delete facility (ADMIN only)
router.delete('/:id', auth, requireRole(['ADMIN']), async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }

    // Soft delete by setting active to false
    facility.active = false;
    facility.updatedBy = req.user.id;
    await facility.save();

    res.json({ success: true, message: 'Facility deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/facilities/types/list - Get unique facility types
router.get('/types/list', async (req, res) => {
  try {
    const types = await Facility.distinct('type', { active: true });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/facilities/:id/qr-code - Get facility QR code
router.get('/:id/qr-code', auth, async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }

    if (!facility.qrEnabled) {
      return res.status(400).json({ success: false, message: 'QR code not enabled for this facility' });
    }

    // Generate QR code if not exists or regenerate if requested
    const qrData = JSON.stringify({
      facilityId: facility._id,
      facilityName: facility.name,
      facilityCode: facility.facilityCode,
      type: 'FACILITY_QR'
    });
    
    const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    
    // Set content type to PNG image
    res.setHeader('Content-Type', 'image/png');
    
    // Convert data URL to buffer and send
    const data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(data, 'base64');
    res.send(buffer);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
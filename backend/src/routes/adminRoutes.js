const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

// Rate limiting for admin authentication to protect against brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

// POST /api/admin/login - Authenticate administrator
router.post('/login', loginLimiter, adminController.login);

// GET /api/admin/dashboard - Dashboard statistics & charts
router.get('/dashboard', authenticateAdmin, adminController.getDashboardStats);

// PATCH /api/admin/incidents/:id - Update status and resolution notes
router.patch('/incidents/:id', authenticateAdmin, adminController.updateIncident);

// POST /api/admin/backup - Export incident records to S3 / local archival
router.post('/backup', authenticateAdmin, adminController.triggerBackup);

module.exports = router;


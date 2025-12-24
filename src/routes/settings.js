const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/settings - Retrieve store settings
router.get('/', getSettings);

// PUT /api/settings - Update store settings
router.put('/', updateSettings);

module.exports = router;
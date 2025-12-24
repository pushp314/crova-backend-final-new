const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { submitInquiry, getInquiries, updateInquiryStatus, replyToInquiry, getUserInquiries } = require('../controllers/designController');
const { validateDesignInquiry } = require('../middleware/validation');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

router.post(
    '/inquire',
    optionalAuth,
    upload.array('images', 3),
    validateDesignInquiry,
    submitInquiry
);

// Get user's own inquiries
router.get(
    '/my-inquiries',
    authenticateToken,
    getUserInquiries
);

// Admin routes
router.get('/', authenticateToken, requireAdmin, getInquiries);
router.put('/:id/status', authenticateToken, requireAdmin, updateInquiryStatus);
router.put('/:id/reply', authenticateToken, requireAdmin, replyToInquiry);

module.exports = router;

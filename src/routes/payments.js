/**
 * Payment Routes
 */
const express = require('express');
const {
    createRazorpayOrder,
    verifyPayment,
    handleWebhook,
} = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Authenticated routes
router.post('/create-order', authenticateToken, createRazorpayOrder);
router.post('/verify', authenticateToken, verifyPayment);

// Webhook (no auth - verified by signature)
router.post('/webhook', handleWebhook);

module.exports = router;

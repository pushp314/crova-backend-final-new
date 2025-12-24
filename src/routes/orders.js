const express = require('express');
const {
  getOrders,
  getOrder,
  createOrder,
  cancelOrder,
  updateOrderStatus,
  // **FIX**: Import the verifyPayment function
  verifyPayment,
  trackOrder
} = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateOrder, validateObjectId, validatePagination } = require('../middleware/validation');
const { orderLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public route for tracking
router.post('/track', trackOrder);

// All other routes require authentication
router.use(authenticateToken);

// User routes
router.get('/', validatePagination, getOrders);
router.get('/:id', validateObjectId, getOrder);
router.post('/', orderLimiter, validateOrder, createOrder); // Rate limited
router.put('/:id/cancel', validateObjectId, cancelOrder);

// The new route for Razorpay verification
router.post('/verify-payment', verifyPayment);

// Admin routes
router.put('/:id/status', requireAdmin, validateObjectId, updateOrderStatus);

module.exports = router;
/**
 * Admin Routes - Dashboard and management APIs
 */
const express = require('express');
const {
  getDashboardStats,
  getSalesAnalytics,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getUsers,
  getTopCustomers,
  updateUserRole,
  deleteUser,
  getLowStockProducts,
  getCustomDesignOrders,
  adminSearch,
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard and analytics
router.get('/stats', getDashboardStats);
router.get('/analytics', getSalesAnalytics);
router.get('/search', adminSearch);

// Order management
router.get('/orders', getOrders);
router.get('/orders/custom-designs', getCustomDesignOrders);
router.get('/orders/:id', getOrderDetail);
router.put('/orders/:id/status', updateOrderStatus);

// User management
router.get('/users', getUsers);
router.get('/users/top-customers', getTopCustomers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Product analytics
router.get('/products/low-stock', getLowStockProducts);

module.exports = router;
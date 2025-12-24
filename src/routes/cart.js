const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');
const { validateCartItem, validateVariantIdParam } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Cart routes
router.get('/', getCart);
router.post('/add', validateCartItem, addToCart);
router.put('/update', validateCartItem, updateCartItem);
// Use variantId parameter instead of productId
router.delete('/remove/:variantId', validateVariantIdParam, removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;
const express = require('express');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');
const { authenticateToken } = require('../middleware/auth');
// **FIX**: Import the new, correct validator
const { validateProductIdParam } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getWishlist);
router.post('/add', addToWishlist); // Note: The body of this request should be validated too if needed.
// **FIX**: Use the correct validator for the 'productId' parameter.
router.delete('/remove/:productId', validateProductIdParam, removeFromWishlist);

module.exports = router;
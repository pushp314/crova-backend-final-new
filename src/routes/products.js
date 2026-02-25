const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  searchProducts,
  bulkAction
} = require('../controllers/productController');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validateProduct, validateObjectId, validatePagination } = require('../middleware/validation');
const { uploadProductImages, handleUploadError } = require('../middleware/upload');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const router = express.Router();

// Public routes
router.get('/', validatePagination, cacheMiddleware(300), getProducts); // Cache for 5 mins
router.get('/featured', cacheMiddleware(300), getFeaturedProducts);
router.get('/search', searchProducts); // Don't cache search usually
router.get('/:id', optionalAuth, cacheMiddleware(300), getProduct);

// Admin routes
router.post('/bulk-action',
  authenticateToken,
  requireAdmin,
  invalidateCache('route:/api/*/products*'),
  bulkAction
);
router.post('/',
  authenticateToken,
  requireAdmin,
  uploadProductImages,
  handleUploadError,
  validateProduct,
  invalidateCache('route:/api/*/products*'), // Invalidate all product caches
  createProduct
);

router.put('/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId,
  uploadProductImages,
  handleUploadError,
  invalidateCache('route:/api/*/products*'),
  updateProduct
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId,
  invalidateCache('route:/api/*/products*'),
  deleteProduct
);

module.exports = router;
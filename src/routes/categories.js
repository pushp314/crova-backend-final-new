const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts
} = require('../controllers/categoryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateCategory, validateObjectId, validatePagination } = require('../middleware/validation');
const { uploadCategoryImage, handleUploadError } = require('../middleware/upload');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

const router = express.Router();

// Public routes
router.get('/', validatePagination, cacheMiddleware(3600), getCategories); // Cache for 1 hour
router.get('/:id', validateObjectId, cacheMiddleware(3600), getCategory);
router.get('/:id/products', validateObjectId, validatePagination, cacheMiddleware(300), getCategoryProducts);

// Admin routes
router.post('/',
  authenticateToken,
  requireAdmin,
  uploadCategoryImage,
  handleUploadError,
  validateCategory,
  invalidateCache('route:/api/*/categories*'), // Invalidate all category caches
  createCategory
);

router.put('/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId,
  uploadCategoryImage,
  handleUploadError,
  invalidateCache('route:/api/*/categories*'),
  updateCategory
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  validateObjectId,
  invalidateCache('route:/api/*/categories*'),
  deleteCategory
);

module.exports = router;
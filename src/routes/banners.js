/**
 * Banner Routes
 */
const express = require('express');
const {
    getBanners,
    getBanner,
    createBanner,
    updateBanner,
    deleteBanner,
    reorderBanners,
} = require('../controllers/bannerController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { uploadBanner } = require('../config/multer');

const router = express.Router();

// Public routes
router.get('/', getBanners);
router.get('/:id', getBanner);

// Admin routes
router.post('/', authenticateToken, requireAdmin, uploadBanner.single('image'), createBanner);
router.put('/:id', authenticateToken, requireAdmin, uploadBanner.single('image'), updateBanner);
router.delete('/:id', authenticateToken, requireAdmin, deleteBanner);
router.post('/reorder', authenticateToken, requireAdmin, reorderBanners);

module.exports = router;

/**
 * Review Routes
 */
const express = require('express');
const {
    getProductReviews,
    createReview,
    updateReview,
    deleteReview,
    getUserReviews,
    canReview,
} = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// Authenticated routes
router.get('/my-reviews', authenticateToken, getUserReviews);
router.get('/can-review/:productId', authenticateToken, canReview);
router.post('/product/:productId', authenticateToken, createReview);
router.put('/:id', authenticateToken, updateReview);
router.delete('/:id', authenticateToken, deleteReview);

module.exports = router;

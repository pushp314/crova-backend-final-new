const express = require('express');
const router = express.Router();
const {
    createCollection,
    getAllCollections,
    getCollectionBySlug,
    updateCollection,
    addProductToCollection,
    removeProductFromCollection,
    deleteCollection
} = require('../controllers/collectionController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getAllCollections);
router.get('/:slug', getCollectionBySlug);

// Admin routes
router.post('/', authenticateToken, requireAdmin, createCollection);
router.put('/:id', authenticateToken, requireAdmin, updateCollection);
router.post('/:id/products', authenticateToken, requireAdmin, addProductToCollection);
router.delete('/:id/products', authenticateToken, requireAdmin, removeProductFromCollection);
router.delete('/:id', authenticateToken, requireAdmin, deleteCollection);

module.exports = router;

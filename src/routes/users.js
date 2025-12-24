const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserOrders,
  // Import new address handlers
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
// Import new address validation
const { validateProfile, validateAddress, validateObjectId } = require('../middleware/validation');
const { uploadAvatar, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', uploadAvatar, handleUploadError, validateProfile, updateProfile);

// Password change
router.post('/change-password', changePassword);

// Account deletion
router.delete('/account', deleteAccount);

// User orders
router.get('/orders', getUserOrders);

// --- NEW: Address Routes ---
router.get('/addresses', getAddresses);
router.post('/addresses', validateAddress, addAddress);
router.put('/addresses/:id', validateObjectId, validateAddress, updateAddress);
router.delete('/addresses/:id', validateObjectId, deleteAddress);


module.exports = router;
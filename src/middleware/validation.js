const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // console.log('Validation Errors:', JSON.stringify(errors.array(), null, 2)); // Debug log removed
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ...



// Auth validations
const validateSignup = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Product validations
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Product name is required and must be less than 200 characters'),
  // **FIX**: Made the description optional. It no longer has a minimum length if provided.
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isUUID()
    .withMessage('Valid category ID is required'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  handleValidationErrors
];

// Category validations
const validateCategory = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name is required and must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors
];

// Cart validations
const validateCartItem = [
  body('variantId')
    .isUUID()
    .withMessage('Valid variant ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  handleValidationErrors
];

// Order validations
const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.variantId')
    .isUUID()
    .withMessage('Valid variant ID is required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1 for each item'),
  body('shippingAddress')
    .isObject()
    .withMessage('Shipping address is required'),
  body('shippingAddress.fullName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Full name is required'),
  body('shippingAddress.address')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Address is required'),
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 1 })
    .withMessage('City is required'),
  body('shippingAddress.postalCode')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Postal code is required'),
  body('shippingAddress.country')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Country is required'),
  handleValidationErrors
];

// User profile validations
const validateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

// Address validations
const validateAddress = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name is required'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address is required'),
  body('city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City is required'),
  body('postalCode')
    .trim()
    .isPostalCode('IN') // Assuming India, change as needed
    .withMessage('Valid postal code is required'),
  body('country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country is required'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be true or false'),
  handleValidationErrors
];

// Password reset validations
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const validateNewPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors
];

// Parameter validations
const validateObjectId = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

const validateVariantIdParam = [
  param('variantId')
    .isUUID()
    .withMessage('Invalid Variant ID format in URL'),
  handleValidationErrors
];

// For routes that still use productId (wishlist, reviews)
const validateProductIdParam = [
  param('productId')
    .isUUID()
    .withMessage('Invalid Product ID format in URL'),
  handleValidationErrors
];

// Query validations
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Design Inquiry validations
const validateDesignInquiry = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim(),
  body('description')
    .trim()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Description must be under 50000 characters'),
  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateProduct,
  validateCategory,
  validateCartItem,
  validateOrder,
  validateProfile,
  validateAddress,
  validatePasswordReset,
  validateNewPassword,
  validateObjectId,
  validateVariantIdParam,
  validateProductIdParam,
  validatePagination,
  validateDesignInquiry, // Added
  handleValidationErrors
};

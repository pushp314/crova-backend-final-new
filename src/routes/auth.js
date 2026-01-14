const express = require('express');
const passport = require('passport');
const {
  signup,
  login,
  refreshAccessToken,
  getMe,
  logout,
  googleCallback,
  forgotPassword,
  resetPassword,
  verifyEmail,
  changePassword,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validations/auth');
const {
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

// Local authentication routes
router.post('/signup', registrationLimiter, validateBody(registerSchema), signup);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, changePassword);

// Google OAuth routes
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
    })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    googleCallback
  );
} else {
  // Return useful error if configured but keys missing
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google Login is currently disabled. Server configuration missing.'
    });
  });
}

// Password reset routes
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  forgotPassword
);
router.post(
  '/reset-password/:token',
  validateBody(resetPasswordSchema),
  resetPassword
);

// Email verification
router.get('/verify-email/:token', verifyEmail);

module.exports = router;
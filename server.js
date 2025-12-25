const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const logger = require('./src/config/logger');
const errorHandler = require('./src/middleware/errorHandler');
const { generalLimiter } = require('./src/middleware/rateLimiter');

// Load environment variables
dotenv.config();

// Passport configuration
require('./src/config/passport');

const app = express();

// Trust Nginx Proxy (Required for proper IP and Protocol detection)
app.set('trust proxy', 1);

// --- LOGGING ---
app.use(morgan('combined', { stream: logger.stream }));

// --- SECURITY MIDDLEWARE ---

// Helmet security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'checkout.razorpay.com'],
        frameSrc: ["'self'", 'api.razorpay.com'],
        connectSrc: ["'self'", 'api.razorpay.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Enable CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://crova.in',
  'https://www.crova.in',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
  maxAge: 86400, // 24 hours cache for preflight
};
app.use(cors(corsOptions));

// Cookie parser (for refresh tokens)
app.use(cookieParser());

// Body Parsers
app.use(express.json({ limit: '10mb' })); // Increased for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Passport
app.use(passport.initialize());

// General Rate Limiter
app.use(generalLimiter);

// --- STATIC FILES ---

// Serve uploaded files via /uploads route
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- API ROUTES (v1) ---
// Legacy routes (for backward compatibility)
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/wishlist', require('./src/routes/wishlist'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/banners', require('./src/routes/banners'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/reviews', require('./src/routes/reviews'));

// Versioned API routes (v1)
app.use('/api/v1/auth', require('./src/routes/auth'));
app.use('/api/v1/products', require('./src/routes/products'));
app.use('/api/v1/categories', require('./src/routes/categories'));
app.use('/api/v1/cart', require('./src/routes/cart'));
app.use('/api/v1/orders', require('./src/routes/orders'));
app.use('/api/v1/users', require('./src/routes/users'));
app.use('/api/v1/wishlist', require('./src/routes/wishlist'));
app.use('/api/v1/settings', require('./src/routes/settings'));
app.use('/api/v1/admin', require('./src/routes/admin'));
app.use('/api/v1/banners', require('./src/routes/banners'));
app.use('/api/v1/payments', require('./src/routes/payments'));
app.use('/api/v1/reviews', require('./src/routes/reviews'));
app.use('/api/v1/collections', require('./src/routes/collections'));
app.use('/api/v1/design', require('./src/routes/design'));

// --- ERROR HANDLING ---
app.use(errorHandler);

// --- 404 HANDLER ---
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// --- SERVER INITIALIZATION ---
// --- SERVER INITIALIZATION ---
const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
    logger.info(`📁 Uploads served at: /uploads`);
    logger.info(`📡 API v1 available at: /api/v1/*`);
  });
}

module.exports = app;
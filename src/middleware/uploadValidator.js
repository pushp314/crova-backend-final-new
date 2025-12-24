/**
 * File Upload Security Middleware
 * Validates file uploads for security
 */
const path = require('path');

// Allowed MIME types and their magic bytes
const ALLOWED_TYPES = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
};

// File size limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 4096; // 4096x4096 max

/**
 * Validate file magic bytes match declared MIME type
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - Declared MIME type
 * @returns {boolean}
 */
const validateMagicBytes = (buffer, mimeType) => {
    const expectedBytes = ALLOWED_TYPES[mimeType];
    if (!expectedBytes) return false;

    for (let i = 0; i < expectedBytes.length; i++) {
        if (buffer[i] !== expectedBytes[i]) return false;
    }
    return true;
};

/**
 * Sanitize filename to prevent path traversal
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename) => {
    // Remove path components
    const basename = path.basename(filename);
    // Remove special characters, keep only alphanumeric, dash, underscore, dot
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Middleware to validate uploaded files
 */
const validateUpload = (req, res, next) => {
    if (!req.file && !req.files) {
        return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
        if (!file) continue;

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            });
        }

        // Check MIME type is allowed
        if (!ALLOWED_TYPES[file.mimetype]) {
            return res.status(400).json({
                success: false,
                message: 'File type not allowed. Allowed types: JPEG, PNG, GIF, WebP',
            });
        }

        // Validate magic bytes
        if (file.buffer && !validateMagicBytes(file.buffer, file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'File content does not match declared type',
            });
        }

        // Sanitize filename
        file.originalname = sanitizeFilename(file.originalname);
    }

    next();
};

/**
 * Validate image dimensions using sharp
 * Use this after multer but before saving
 */
const validateImageDimensions = async (req, res, next) => {
    if (!req.file && !req.files) {
        return next();
    }

    try {
        // Only validate if sharp is available
        let sharp;
        try {
            sharp = require('sharp');
        } catch {
            // Sharp not installed, skip dimension check
            return next();
        }

        const files = req.files || [req.file];

        for (const file of files) {
            if (!file || !file.buffer) continue;

            const metadata = await sharp(file.buffer).metadata();

            if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
                return res.status(400).json({
                    success: false,
                    message: `Image dimensions too large. Maximum is ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}`,
                });
            }
        }

        next();
    } catch (error) {
        console.error('Image validation error:', error);
        return res.status(400).json({
            success: false,
            message: 'Invalid image file',
        });
    }
};

module.exports = {
    validateUpload,
    validateImageDimensions,
    sanitizeFilename,
    MAX_FILE_SIZE,
    ALLOWED_TYPES,
};

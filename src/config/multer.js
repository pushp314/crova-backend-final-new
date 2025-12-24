/**
 * Multer Configuration - Local Disk Storage
 * Handles file uploads for products, banners, and custom designs
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const uploadDirs = ['uploads/products', 'uploads/banners', 'uploads/custom-designs', 'uploads/avatars'];
uploadDirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// File filter - validate file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
};

// Generate unique filename
const generateFilename = (file) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    return `${Date.now()}-${uniqueSuffix}${ext}`;
};

// Product images storage
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/products'));
    },
    filename: (req, file, cb) => {
        cb(null, generateFilename(file));
    },
});

// Banner images storage
const bannerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/banners'));
    },
    filename: (req, file, cb) => {
        cb(null, generateFilename(file));
    },
});

// Custom design storage
const customDesignStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/custom-designs'));
    },
    filename: (req, file, cb) => {
        cb(null, generateFilename(file));
    },
});

// Avatar storage
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads/avatars'));
    },
    filename: (req, file, cb) => {
        cb(null, generateFilename(file));
    },
});

// Max file size (5MB)
const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// Export configured multer instances
const uploadProduct = multer({
    storage: productStorage,
    fileFilter,
    limits: { fileSize: maxSize },
});

const uploadBanner = multer({
    storage: bannerStorage,
    fileFilter,
    limits: { fileSize: maxSize },
});

const uploadCustomDesign = multer({
    storage: customDesignStorage,
    fileFilter,
    limits: { fileSize: maxSize * 2 }, // Allow larger for custom designs
});

const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter,
    limits: { fileSize: maxSize },
});

/**
 * Save base64 image to disk
 * Used for custom t-shirt designs from canvas
 */
const saveBase64Image = async (base64Data, folder = 'custom-designs') => {
    const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 image data');
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filepath = path.join(process.cwd(), 'uploads', folder, filename);

    await fs.promises.writeFile(filepath, buffer);

    return `/uploads/${folder}/${filename}`;
};

/**
 * Delete file from disk
 */
const deleteFile = async (filepath) => {
    try {
        const fullPath = path.join(process.cwd(), filepath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

module.exports = {
    uploadProduct,
    uploadBanner,
    uploadCustomDesign,
    uploadAvatar,
    saveBase64Image,
    deleteFile,
};

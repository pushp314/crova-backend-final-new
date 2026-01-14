const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = 'uploads/';
const bannersDir = path.join(uploadDir, 'banners');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(bannersDir)) {
    fs.mkdirSync(bannersDir, { recursive: true });
}

// Configure storage for Banners
const bannerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, bannersDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const uploadBanner = multer({
    storage: bannerStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Utility to delete file
const deleteFile = (filePath) => {
    if (!filePath) return;

    // Check if path is full path or relative to uploads
    let fullPath = filePath;
    if (!path.isAbsolute(filePath)) {
        // If it starts with /uploads, make it relative to root
        if (filePath.startsWith('/uploads')) {
            fullPath = path.join(process.cwd(), filePath.substring(1)); // Remove leading slash
        } else {
            fullPath = path.join(process.cwd(), filePath);
        }
    }

    try {
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    } catch (err) {
        console.error(`Error deleting file: ${fullPath}`, err);
    }
};

module.exports = {
    uploadBanner,
    deleteFile
};

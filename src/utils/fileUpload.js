const path = require('path');

/**
 * Extracts the file path or URL from a multer file object.
 * Works for both diskStorage and multerS3 (Cloudflare R2).
 * 
 * @param {Object} file - The multer file object
 * @param {string} folder - The fallback folder name for local storage
 * @returns {string} - The path or URL to be stored in the database
 */
const getFileUrl = (file, folder) => {
    if (!file) return null;

    // Use the local filename and folder structure
    return `/uploads/${folder}/${file.filename}`;
};

/**
 * Extracts multiple file paths or URLs from an array of multer file objects.
 * 
 * @param {Array} files - Array of multer file objects
 * @param {string} folder - The fallback folder name for local storage
 * @returns {Array<string>} - Array of paths or URLs
 */
const getFilesUrls = (files, folder) => {
    if (!files || !Array.isArray(files)) return [];
    return files.map(file => getFileUrl(file, folder));
};

module.exports = {
    getFileUrl,
    getFilesUrls
};

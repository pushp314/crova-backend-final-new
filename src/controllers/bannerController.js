/**
 * Banner Controller - Promotional banner management
 */
const prisma = require('../config/database');
const { deleteFile } = require('../config/multer');
const AppError = require('../utils/AppError');
const { getFileUrl } = require('../utils/fileUpload');

// Get all banners (public)
const getBanners = async (req, res) => {
    try {
        const activeOnly = req.query.activeOnly !== 'false';

        const where = activeOnly ? { isActive: true } : {};

        const banners = await prisma.banner.findMany({
            where,
            orderBy: { position: 'asc' },
        });

        res.json({
            success: true,
            banners,
        });
    } catch (error) {
        console.error('Get banners error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};

// Get single banner
const getBanner = async (req, res, next) => {
    try {
        const { id } = req.params;

        const banner = await prisma.banner.findUnique({
            where: { id },
        });

        if (!banner) {
            return next(new AppError('Banner not found', 404));
        }

        res.json({
            success: true,
            data: { banner },
        });
    } catch (error) {
        next(error);
    }
};

// Create new banner
const createBanner = async (req, res, next) => {
    try {
        const { title, subtitle, link, type, order, isActive } = req.body;

        if (!req.file) {
            return next(new AppError('Image is required', 400));
        }

        const image = getFileUrl(req.file, 'banners');

        const banner = await prisma.banner.create({
            data: {
                title: title?.trim(),
                subtitle: subtitle?.trim(),
                image,
                link: link?.trim(),
                type: type || 'HERO',
                order: order ? parseInt(order) : 0,
                isActive: isActive === 'true' || isActive === true
            }
        });

        res.status(201).json({
            success: true,
            message: 'Banner created successfully',
            data: { banner }
        });
    } catch (error) {
        // If error occurs, delete uploaded file
        if (req.file) {
            const filePath = path.join(__dirname, '../../uploads/banners', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        next(error);
    }
};

// Update banner
const updateBanner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, subtitle, link, type, order, isActive } = req.body;

        const existingBanner = await prisma.banner.findUnique({
            where: { id }
        });

        if (!existingBanner) {
            // Delete uploaded file if banner not found
            if (req.file) {
                const filePath = path.join(__dirname, '../../uploads/banners', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return next(new AppError('Banner not found', 404));
        }

        const updateData = {
            ...(title !== undefined && { title: title.trim() }),
            ...(subtitle !== undefined && { subtitle: subtitle.trim() }),
            ...(link !== undefined && { link: link.trim() }),
            ...(type !== undefined && { type }),
            ...(order !== undefined && { order: parseInt(order) }),
            ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true })
        };

        // Handle image update
        if (req.file) {
            updateData.image = getFileUrl(req.file, 'banners');

            // Delete old image
            if (existingBanner.image) {
                const oldImageName = existingBanner.image.split('/').pop();
                const oldImagePath = path.join(__dirname, '../../uploads/banners', oldImageName);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        const banner = await prisma.banner.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Banner updated successfully',
            data: { banner }
        });
    } catch (error) {
        // If error occurs, delete new uploaded file
        if (req.file) {
            const filePath = path.join(__dirname, '../../uploads/banners', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        next(error);
    }
};

// Delete banner
const deleteBanner = async (req, res, next) => {
    try {
        const { id } = req.params;

        const banner = await prisma.banner.findUnique({
            where: { id }
        });

        if (!banner) {
            return next(new AppError('Banner not found', 404));
        }

        // Delete image file
        if (banner.image) {
            const imageName = banner.image.split('/').pop();
            const imagePath = path.join(__dirname, '../../uploads/banners', imageName);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await prisma.banner.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Reorder banners
const reorderBanners = async (req, res, next) => {
    try {
        const { bannerIds } = req.body;

        if (!Array.isArray(bannerIds)) {
            return next(new AppError('bannerIds must be an array', 400));
        }

        // Update order for each banner in transaction
        await prisma.$transaction(
            bannerIds.map((id, index) =>
                prisma.banner.update({
                    where: { id },
                    data: { order: index }
                })
            )
        );

        const banners = await prisma.banner.findMany({
            orderBy: { order: 'asc' }
        });

        res.json({
            success: true,
            message: 'Banners reordered successfully',
            data: { banners }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBanners,
    getBanner,
    createBanner,
    updateBanner,
    deleteBanner,
    reorderBanners,
};

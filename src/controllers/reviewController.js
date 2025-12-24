/**
 * Review Controller - Product reviews management
 */
const prisma = require('../config/database');
const AppError = require('../utils/AppError');

// Helper to update product rating
const updateProductRating = async (productId) => {
    const aggregate = await prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { rating: true },
    });

    await prisma.product.update({
        where: { id: productId },
        data: {
            rating: aggregate._avg.rating || 0,
            numReviews: aggregate._count.rating || 0,
        },
    });
};

// Get product reviews
const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const reviews = await prisma.review.findMany({
            where: { productId },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        const totalReviews = await prisma.review.count({ where: { productId } });

        // Calculate average rating
        const avgRating = await prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
        });

        res.json({
            success: true,
            reviews,
            averageRating: avgRating._avg.rating || 0,
            pagination: {
                page,
                limit,
                total: totalReviews,
                pages: Math.ceil(totalReviews / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Create review
const createReview = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return next(new AppError('Rating must be between 1 and 5', 400));
        }

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            return next(new AppError('Product not found', 404));
        }

        // Check if user has purchased this product
        const hasPurchased = await prisma.orderItem.findFirst({
            where: {
                order: {
                    userId,
                    status: 'DELIVERED',
                },
                variant: {
                    productId,
                },
            },
        });

        if (!hasPurchased) {
            return next(new AppError('You can only review products you have purchased', 403));
        }

        // Check if user already reviewed this product
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_productId: { userId, productId },
            },
        });

        if (existingReview) {
            return next(new AppError('You have already reviewed this product', 400));
        }

        const review = await prisma.review.create({
            data: {
                userId,
                productId,
                rating,
                comment: comment?.trim(),
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
        });

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review,
        });

        // Update product rating
        await updateProductRating(productId);

    } catch (error) {
        next(error);
    }
};

// Update review
const updateReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        const userId = req.user.id;

        const review = await prisma.review.findUnique({
            where: { id },
        });

        if (!review) {
            return next(new AppError('Review not found', 404));
        }

        if (review.userId !== userId) {
            return next(new AppError('You can only edit your own reviews', 403));
        }

        // Validate rating if provided
        if (rating && (rating < 1 || rating > 5)) {
            return next(new AppError('Rating must be between 1 and 5', 400));
        }

        const updatedReview = await prisma.review.update({
            where: { id },
            data: {
                ...(rating && { rating }),
                ...(comment !== undefined && { comment: comment?.trim() }),
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
        });



        // Update product rating
        await updateProductRating(review.productId);

        res.json({
            success: true,
            message: 'Review updated successfully',
            review: updatedReview,
        });
    } catch (error) {
        next(error);
    }
};

// Delete review
const deleteReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'ADMIN';

        const review = await prisma.review.findUnique({
            where: { id },
        });

        if (!review) {
            return next(new AppError('Review not found', 404));
        }

        // Only owner or admin can delete
        if (review.userId !== userId && !isAdmin) {
            return next(new AppError('Unauthorized', 403));
        }

        await prisma.review.delete({
            where: { id },
        });



        // Update product rating
        await updateProductRating(review.productId);

        res.json({
            success: true,
            message: 'Review deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Get user's reviews
const getUserReviews = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const reviews = await prisma.review.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        images: {
                            where: { isPrimary: true },
                            take: 1,
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            reviews,
        });
    } catch (error) {
        next(error);
    }
};

// Check if user can review a product
const canReview = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        // Check if user has purchased this product (delivered order)
        const hasPurchased = await prisma.orderItem.findFirst({
            where: {
                order: {
                    userId,
                    status: 'DELIVERED',
                },
                variant: {
                    productId,
                },
            },
        });

        // Check if user already reviewed this product
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_productId: { userId, productId },
            },
        });

        res.json({
            success: true,
            canReview: hasPurchased && !existingReview,
            hasPurchased: !!hasPurchased,
            hasReviewed: !!existingReview,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProductReviews,
    createReview,
    updateReview,
    deleteReview,
    getUserReviews,
    canReview,
};

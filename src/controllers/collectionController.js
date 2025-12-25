const prisma = require('../config/database');
const { slugify } = require('../utils/helpers');
const AppError = require('../utils/AppError');

// ... (previous functions: createCollection, getAllCollections, getCollectionBySlug)

const updateCollection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, image, theme, textColor, slug, products } = req.body;

        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (image) updateData.image = image;
        if (theme) updateData.theme = theme;
        if (textColor) updateData.textColor = textColor;
        if (slug) updateData.slug = slug;

        if (products) {
            // products is array of IDs
            updateData.products = {
                set: products.map(id => ({ id }))
            };
        }

        const collection = await prisma.collection.update({
            where: { id },
            data: updateData,
            include: {
                products: {
                    select: { id: true, name: true }
                }
            }
        });

        res.json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
};

const createCollection = async (req, res, next) => {
    try {
        const { title, description, image, theme, textColor, products } = req.body;

        // Simple slug generator if not provided
        const slug = req.body.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const existing = await prisma.collection.findUnique({ where: { slug } });
        if (existing) {
            return next(new AppError('Collection with this slug already exists', 400));
        }

        const collection = await prisma.collection.create({
            data: {
                title,
                slug,
                description,
                image,
                theme,
                textColor,
                products: products ? {
                    connect: products.map(id => ({ id }))
                } : undefined
            },
        });

        res.status(201).json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
};

const getAllCollections = async (req, res, next) => {
    try {
        const collections = await prisma.collection.findMany({
            where: { isActive: true },
            include: {
                products: {
                    where: { isActive: true },
                    take: 4, // Preview products
                    include: { images: { where: { isPrimary: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Add stats
        const collectionsWithCount = await Promise.all(collections.map(async (col) => {
            const count = await prisma.product.count({
                where: {
                    collections: { some: { id: col.id } },
                    isActive: true
                }
            });
            return { ...col, stats: `${count} Items` };
        }));

        res.json({ success: true, data: { collections: collectionsWithCount } });
    } catch (error) {
        next(error);
    }
};

const getCollectionBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const collection = await prisma.collection.findUnique({
            where: { slug },
            include: {
                products: {
                    where: { isActive: true },
                    include: {
                        images: true,
                        category: true,
                        variants: true
                    }
                }
            }
        });

        if (!collection) {
            return next(new AppError('Collection not found', 404));
        }

        res.json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
};

const addProductToCollection = async (req, res, next) => {
    try {
        const { id } = req.params; // Collection ID
        const { productId } = req.body;

        await prisma.collection.update({
            where: { id },
            data: {
                products: {
                    connect: { id: productId }
                }
            }
        });

        res.json({ success: true, message: 'Product added to collection' });
    } catch (error) {
        next(error);
    }
};

const removeProductFromCollection = async (req, res, next) => {
    try {
        const { id } = req.params; // Collection ID
        const { productId } = req.body;

        await prisma.collection.update({
            where: { id },
            data: {
                products: {
                    disconnect: { id: productId }
                }
            }
        });

        res.json({ success: true, message: 'Product removed from collection' });
    } catch (error) {
        next(error);
    }
};

const deleteCollection = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.collection.delete({ where: { id } });
        res.json({ success: true, message: 'Collection deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createCollection,
    getAllCollections,
    getCollectionBySlug,
    updateCollection, // Added
    addProductToCollection,
    removeProductFromCollection,
    deleteCollection
};

const prisma = require('../config/database');
const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// Redis Import
const { cache, CACHE_KEYS, CACHE_TTL } = require('../config/redis');

// Get all products
const getProducts = async (req, res, next) => {
  try {
    logger.info(`Get products query: ${JSON.stringify(req.query)}`);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const categoryName = req.query.category;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where = {};

    // Only filter by isActive if includeInactive is NOT true
    if (req.query.includeInactive !== 'true') {
      where.isActive = true;
    }

    // Add price filter only if provided
    if (req.query.minPrice || req.query.maxPrice) {
      where.price = {};
      if (req.query.minPrice) where.price.gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) where.price.lte = parseFloat(req.query.maxPrice);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const virtualCategories = ['tops', 'bottoms', 'outwear', 'outerwear'];

    if (categoryName) {
      // Check for Virtual Categories (cross-category types)
      if (virtualCategories.includes(categoryName.toLowerCase())) {
        const keyword = categoryName.toLowerCase() === 'outwear' ? 'outerwear' : categoryName.toLowerCase();

        // Add text-based filtering for these types
        const typeFilter = [
          { name: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          // Add specific mapping for common items if needed
          ...(keyword === 'tops' ? [
            { name: { contains: 'shirt', mode: 'insensitive' } },
            { name: { contains: 'blouse', mode: 'insensitive' } },
            { name: { contains: 'camisole', mode: 'insensitive' } }
          ] : []),
          ...(keyword === 'bottoms' ? [
            { name: { contains: 'pant', mode: 'insensitive' } },
            { name: { contains: 'jeans', mode: 'insensitive' } },
            { name: { contains: 'skirt', mode: 'insensitive' } },
            { name: { contains: 'trouser', mode: 'insensitive' } }
          ] : []),
          ...(keyword === 'outerwear' ? [
            { name: { contains: 'jacket', mode: 'insensitive' } },
            { name: { contains: 'coat', mode: 'insensitive' } },
            { name: { contains: 'hoodie', mode: 'insensitive' } }
          ] : [])
        ];

        // Combine with existing OR or create new one
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            { OR: typeFilter }
          ];
          delete where.OR;
        } else {
          where.OR = typeFilter;
        }

      } else {
        // Normal Database Category Lookup
        const category = await prisma.category.findFirst({
          where: { name: { equals: categoryName, mode: 'insensitive' } }
        });

        if (category) {
          where.categoryId = category.id;
        } else {
          // If category not found, return empty (standard behavior)
          // But let's log it to be sure
          logger.debug(`Category '${categoryName}' not found in DB`);
          return res.json({
            success: true,
            data: {
              products: [],
              pagination: { page, limit, total: 0, pages: 0 }
            }
          });
        }
      }
    }

    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        variants: true,
        images: {
          orderBy: { position: 'asc' },
          take: 2  // Only first 2 images for list view
        }
      },
      orderBy,
      skip,
      take: limit
    });

    const totalProducts = await prisma.product.count({ where });

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total: totalProducts,
          pages: Math.ceil(totalProducts / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single product (with Redis caching)
// Supports both UUID (id) and slug lookups
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:${id}`;

    // Try cache first
    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for product ${id}`);
        return res.json({
          success: true,
          data: { product: cached }
        });
      }
    }

    // Detect if param is UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const product = await prisma.product.findUnique({
      where: isUUID ? { id } : { slug: id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        },
        variants: true,
        images: {
          orderBy: { position: 'asc' }
        },
        collections: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!product || !product.isActive) {
      return next(new AppError('Product not found', 404));
    }

    // Cache the result
    if (cache) {
      await cache.set(cacheKey, product, CACHE_TTL.MEDIUM);
      logger.debug(`Cached product ${id}`);
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

// Create product (Admin only)
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stock } = req.body;

    const categoryExists = await prisma.category.findUnique({
      where: { id: category }
    });

    if (!categoryExists) {
      return next(new AppError('Category not found', 400));
    }

    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        comparePrice: req.body.comparePrice ? parseFloat(req.body.comparePrice) : null,
        category,
        stock: parseInt(stock),
        images,
        collections: req.body.collections ? {
          connect: req.body.collections.map(id => ({ id }))
        } : undefined
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Invalidate products cache
    if (cache) {
      await cache.delByPattern('products:*');
      logger.debug('Invalidated products cache');
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

// Update product (Admin only)
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, stock, isActive } = req.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return next(new AppError('Product not found', 404));
    }

    if (category) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: category }
      });

      if (!categoryExists) {
        return next(new AppError('Category not found', 400));
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description) updateData.description = description.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (req.body.comparePrice !== undefined) {
      updateData.comparePrice = req.body.comparePrice ? parseFloat(req.body.comparePrice) : null;
    }
    if (category) updateData.category = category;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
      updateData.images = [...existingProduct.images, ...newImages];
    }

    if (req.body.collections) {
      updateData.collections = {
        set: req.body.collections.map(id => ({ id }))
      };
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Invalidate caches
    if (cache) {
      await cache.del(`product:${id}`);
      await cache.delByPattern('products:*');
      logger.debug(`Invalidated cache for product ${id}`);
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

// Delete product (Admin only)
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    // Invalidate caches
    if (cache) {
      await cache.del(`product:${id}`);
      await cache.delByPattern('products:*');
      logger.debug(`Invalidated cache for deleted product ${id}`);
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get featured products (with Redis caching)
const getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const cacheKey = `featured:${limit}`;

    // Try cache first
    if (cache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for featured products');
        return res.json({
          success: true,
          data: { products: cached }
        });
      }
    }

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        images: {
          take: 1,
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Cache for 5 minutes
    if (cache) {
      await cache.set(cacheKey, products, CACHE_TTL.MEDIUM);
      logger.debug('Cached featured products');
    }

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    next(error);
  }
};

// Search products
const searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit) || 10;

    if (!q || q.trim().length < 2) {
      return next(new AppError('Search query must be at least 2 characters long', 400));
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q.trim(), mode: 'insensitive' } },
          { description: { contains: q.trim(), mode: 'insensitive' } }
        ]
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        images: {
          take: 1,
          orderBy: { position: 'asc' }
        }
      },
      take: limit
    });

    res.json({
      success: true,
      data: { products }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  searchProducts
};
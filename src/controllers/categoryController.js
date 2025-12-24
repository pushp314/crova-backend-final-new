const prisma = require('../config/database');
const AppError = require('../utils/AppError');

// Get all categories
const getCategories = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const includeInactive = req.query.includeInactive === 'true';

    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    const totalCategories = await prisma.category.count({ where });

    res.json({
      success: true,
      data: {
        categories,
        pagination: {
          page,
          limit,
          total: totalCategories,
          pages: Math.ceil(totalCategories / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single category
const getCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          take: 12,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            products: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!category || !category.isActive) {
      return next(new AppError('Category not found', 404));
    }

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

// Create category (Admin only)
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Check if category already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() }
    });

    if (existingCategory) {
      return next(new AppError('Category already exists', 400));
    }

    // Handle image upload
    const image = req.file ? `/uploads/categories/${req.file.filename}` : null;

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        image
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

// Update category (Admin only)
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return next(new AppError('Category not found', 404));
    }

    // Check if name is being changed and if it already exists
    if (name && name.trim() !== existingCategory.name) {
      const nameExists = await prisma.category.findUnique({
        where: { name: name.trim() }
      });

      if (nameExists) {
        return next(new AppError('Category name already exists', 400));
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    // Handle image upload
    if (req.file) {
      updateData.image = `/uploads/categories/${req.file.filename}`;
    }

    const category = await prisma.category.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    // Check if category has products
    if (category._count.products > 0) {
      return next(new AppError('Cannot delete category with existing products', 400));
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get category products
const getCategoryProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category || !category.isActive) {
      return next(new AppError('Category not found', 404));
    }

    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const products = await prisma.product.findMany({
      where: {
        category: id,
        isActive: true
      },
      include: {
        categoryRef: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    });

    const totalProducts = await prisma.product.count({
      where: {
        category: id,
        isActive: true
      }
    });

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          description: category.description
        },
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

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts
};
/**
 * Admin Controller - Production-grade dashboard analytics
 */
const prisma = require('../config/database');
const AppError = require('../utils/AppError');

// ============================================
// DASHBOARD OVERVIEW METRICS
// ============================================

const getDashboardStats = async (req, res, next) => {
  try {
    // Run all queries in parallel for performance
    const [
      totalRevenueResult,
      totalOrders,
      totalCustomers,
      pendingOrders,
      paymentSplit,
      recentOrders,
      lowStockCount,
      pendingInquiries,
    ] = await Promise.all([
      // Total Revenue
      prisma.order.aggregate({
        where: { paymentStatus: 'SUCCESS' },
        _sum: { totalAmount: true },
      }),
      // Total Orders
      prisma.order.count(),
      // Total Customers
      prisma.user.count({ where: { role: 'USER' } }),
      // Pending Orders
      prisma.order.count({ where: { status: 'PENDING' } }),
      // Payment Method Split
      prisma.order.groupBy({
        by: ['paymentMethod'],
        _count: { _all: true },
      }),
      // Recent Orders
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      // Low Stock Count
      prisma.productVariant.count({ where: { stock: { lte: 5 } } }),
      // Pending Design Inquiries
      prisma.designInquiry.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenueResult._sum.totalAmount || 0,
        totalOrders,
        totalCustomers,
        pendingOrders,
        lowStockCount,
        paymentSplit: paymentSplit.map((p) => ({
          method: p.paymentMethod,
          count: p._count._all,
        })),
        pendingInquiries,
      },
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// REVENUE ANALYTICS
// ============================================

const getSalesAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    // Daily Revenue (Last N days)
    const dailyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM("totalAmount") as revenue,
        COUNT(*) as orders
      FROM "Order"
      WHERE "paymentStatus" = 'SUCCESS'
      AND "createdAt" >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC;
    `;

    // Monthly Revenue
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM("totalAmount") as revenue,
        COUNT(*) as orders
      FROM "Order"
      WHERE "paymentStatus" = 'SUCCESS'
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12;
    `;

    // Top Selling Products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['variantId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    });

    // Get variant details for top products
    const variantIds = topProducts.map((p) => p.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    });

    const topProductsWithDetails = topProducts.map((tp) => {
      const variant = variants.find((v) => v.id === tp.variantId);
      return {
        variantId: tp.variantId,
        totalSold: tp._sum.quantity,
        product: variant?.product,
        size: variant?.size,
        color: variant?.color,
      };
    });

    // Order Status Distribution
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    res.json({
      success: true,
      analytics: {
        dailyRevenue,
        monthlyRevenue,
        topProducts: topProductsWithDetails,
        ordersByStatus: ordersByStatus.map((o) => ({
          status: o.status,
          count: o._count._all,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ORDERS MANAGEMENT
// ============================================

const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, search, paymentStatus } = req.query;

    const where = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          payment: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    images: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        payment: true,
        customDesign: true,
      },
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status', 400));
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      success: true,
      message: 'Order status updated',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { role, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isEmailVerified: true,
          provider: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTopCustomers = async (req, res, next) => {
  try {
    const topCustomers = await prisma.order.groupBy({
      by: ['userId'],
      where: { paymentStatus: 'SUCCESS' },
      _count: { _all: true },
      _sum: { totalAmount: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 10,
    });

    const userIds = topCustomers.map((c) => c.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const result = topCustomers.map((tc) => ({
      user: users.find((u) => u.id === tc.userId),
      totalOrders: tc._count._all,
      totalSpent: tc._sum.totalAmount,
    }));

    res.json({ success: true, topCustomers: result });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return next(new AppError('Invalid role', 400));
    }

    if (id === req.user.id) {
      return next(new AppError('Cannot change your own role', 400));
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'User role updated',
      user,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return next(new AppError('Cannot delete your own account', 400));
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// PRODUCT ANALYTICS
// ============================================

const getLowStockProducts = async (req, res, next) => {
  try {
    const threshold = parseInt(req.query.threshold) || 5;

    const lowStock = await prisma.productVariant.findMany({
      where: { stock: { lte: threshold } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { stock: 'asc' },
    });

    res.json({ success: true, lowStock });
  } catch (error) {
    next(error);
  }
};

// ============================================
// CUSTOM DESIGN ORDERS
// ============================================

const getCustomDesignOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customDesign: { isNot: null } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          customDesign: true,
        },
      }),
      prisma.order.count({ where: { customDesign: { isNot: null } } }),
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN SEARCH
// ============================================

const adminSearch = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, results: {} });
    }

    const [products, users, orders] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, slug: true },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, email: true },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          orderNumber: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, orderNumber: true, status: true },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      results: { products, users, orders },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// AUDIT LOGS
// ============================================

const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { action, userName, resource } = req.query;

    const where = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userName) {
      where.userName = { contains: userName, mode: 'insensitive' };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getSalesAnalytics,
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  getUsers,
  getTopCustomers,
  updateUserRole,
  deleteUser,
  getLowStockProducts,
  getCustomDesignOrders,
  adminSearch,
  getAuditLogs
};
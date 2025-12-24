const prisma = require('../config/database');
const AppError = require('../utils/AppError');

/**
 * Cart Controller - UPDATED to use ProductVariant instead of Product
 * Cart items link to specific variants (size/color combinations)
 */

// Helper: Build cart include query
const cartIncludeQuery = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              isActive: true,
              images: {
                where: { isPrimary: true },
                take: 1
              }
            }
          }
        }
      }
    }
  }
};

// Helper: Format cart response with totals
const formatCartResponse = (cart) => {
  // Filter out items with inactive products
  const activeItems = cart.items.filter(item =>
    item.variant && item.variant.product && item.variant.product.isActive
  );

  // Calculate totals
  const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = activeItems.reduce((sum, item) =>
    sum + (Number(item.variant.product.price) * item.quantity), 0
  );

  return {
    id: cart.id,
    items: activeItems.map(item => ({
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      variant: {
        id: item.variant.id,
        size: item.variant.size,
        color: item.variant.color,
        stock: item.variant.stock,
        sku: item.variant.sku
      },
      product: item.variant.product
    })),
    itemCount,
    totalAmount
  };
};

// Get user's cart
const getCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: cartIncludeQuery
    });

    // Create cart if it doesn't exist
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: cartIncludeQuery
      });
    }

    res.json({
      success: true,
      data: {
        cart: formatCartResponse(cart)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add item to cart - NOW USES variantId
const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { variantId, quantity } = req.body;

    // Validate quantity
    if (!quantity || quantity < 1) {
      return next(new AppError('Quantity must be at least 1', 400));
    }

    // Check if variant exists with product info
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: { id: true, name: true, isActive: true }
        }
      }
    });

    if (!variant) {
      return next(new AppError('Product variant not found', 404));
    }

    if (!variant.product.isActive) {
      return next(new AppError('Product is no longer available', 400));
    }

    // Check stock availability
    if (variant.stock < quantity) {
      return next(new AppError(`Insufficient stock. Only ${variant.stock} available.`, 400));
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }

    // Check if item already exists in cart (using correct unique constraint)
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId
        }
      }
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      if (variant.stock < newQuantity) {
        return next(new AppError(`Cannot add more. Only ${variant.stock} available in stock.`, 400));
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    } else {
      // Create new cart item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity
        }
      });
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: cartIncludeQuery
    });

    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        cart: formatCartResponse(updatedCart)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update cart item quantity - NOW USES variantId
const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { variantId, quantity } = req.body;

    if (quantity <= 0) {
      return next(new AppError('Quantity must be greater than 0', 400));
    }

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      return next(new AppError('Cart not found', 404));
    }

    // Check if variant exists and is active
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: { select: { isActive: true, name: true } }
      }
    });

    if (!variant) {
      return next(new AppError('Product variant not found', 404));
    }

    if (!variant.product.isActive) {
      return next(new AppError('Product is no longer available', 400));
    }

    // Check stock availability
    if (variant.stock < quantity) {
      return next(new AppError(`Insufficient stock. Only ${variant.stock} available.`, 400));
    }

    // Update cart item
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId
        }
      }
    });

    if (!cartItem) {
      return next(new AppError('Item not found in cart', 404));
    }

    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity }
    });

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: cartIncludeQuery
    });

    res.json({
      success: true,
      message: 'Cart updated',
      data: {
        cart: formatCartResponse(updatedCart)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Remove item from cart - NOW USES variantId
const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { variantId } = req.params;

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      return next(new AppError('Cart not found', 404));
    }

    // Remove cart item
    const deletedItem = await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        variantId
      }
    });

    if (deletedItem.count === 0) {
      return next(new AppError('Item not found in cart', 404));
    }

    // Return updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: cartIncludeQuery
    });

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cart: formatCartResponse(updatedCart)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Clear cart
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get cart
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });

    if (!cart) {
      return next(new AppError('Cart not found', 404));
    }

    // Remove all items from cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    res.json({
      success: true,
      message: 'Cart cleared',
      data: {
        cart: {
          id: cart.id,
          items: [],
          itemCount: 0,
          totalAmount: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
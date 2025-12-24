const prisma = require('../config/database');
const AppError = require('../utils/AppError');

// Get the user's wishlist
const getWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        }
      }
    });

    if (!wishlist) {
      // If no wishlist, create one for the user
      const newWishlist = await prisma.wishlist.create({
        data: { userId },
        include: { items: true }
      });
      return res.json({ success: true, data: { wishlist: newWishlist } });
    }

    res.json({ success: true, data: { wishlist } });
  } catch (error) {
    next(error);
  }
};

// Add an item to the wishlist
const addToWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      return next(new AppError('Wishlist not found', 404));
    }

    // Check if item already exists
    const existingItem = await prisma.wishlistItem.findFirst({
      where: { wishlistId: wishlist.id, productId }
    });

    if (existingItem) {
      return next(new AppError('Item already in wishlist', 400));
    }

    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      }
    });

    res.status(201).json({ success: true, message: 'Item added to wishlist' });
  } catch (error) {
    next(error);
  }
};

// Remove an item from the wishlist
const removeFromWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const wishlist = await prisma.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      return next(new AppError('Wishlist not found', 404));
    }

    await prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId,
      }
    });

    res.json({ success: true, message: 'Item removed from wishlist' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
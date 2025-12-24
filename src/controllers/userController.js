const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');

// Get user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return next(new AppError('Email already in use', 400));
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) {
      updateData.email = email.toLowerCase();
      updateData.isEmailVerified = false; // Reset verification if email changed
    }

    // Handle avatar upload
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.password) {
      return next(new AppError('Cannot change password for this account', 400));
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete user account
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Delete user (this will cascade delete related data)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get user orders
const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                    price: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const totalOrders = await prisma.order.count({
      where: { userId }
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total: totalOrders,
          pages: Math.ceil(totalOrders / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// --- NEW: ADDRESS MANAGEMENT ---

const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { addresses } });
  } catch (error) {
    next(error);
  }
};

const addAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, street, address, line2, city, state, postalCode, country, isDefault } = req.body;

    // Map address to street
    const streetValue = street || address;

    // If setting a new default, unset the old one
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: { userId, fullName, phone, street: streetValue, line2, city, state, postalCode, country, isDefault },
    });

    res.status(201).json({ success: true, message: 'Address added', data: { address: newAddress } });
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { fullName, phone, street, address, line2, city, state, postalCode, country, isDefault } = req.body;

    // Map address to street
    const streetValue = street || address;

    const existingAddress = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!existingAddress) {
      return next(new AppError('Address not found', 404));
    }

    // If setting a new default, unset the old one
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { fullName, phone, street: streetValue, line2, city, state, postalCode, country, isDefault },
    });

    res.json({ success: true, message: 'Address updated', data: { address: updatedAddress } });
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const addressToDelete = await prisma.address.findFirst({
      where: { id, userId }
    });

    if (!addressToDelete) {
      return next(new AppError('Address not found', 404));
    }

    await prisma.address.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserOrders,
  // Export new address functions
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
};
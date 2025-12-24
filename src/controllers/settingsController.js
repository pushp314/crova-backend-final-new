const prisma = require('../config/database');
const AppError = require('../utils/AppError');

// Get or create settings
// Get or create settings
const getSettings = async (req, res, next) => {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      // If no settings exist, create a default entry
      settings = await prisma.settings.create({
        data: {
          storeName: "NOVA",
          contactEmail: "contact@nova.com",
          shippingRate: 50,
          freeShippingThreshold: 4999,
        }
      });
    }
    res.json({ success: true, data: { settings } });
  } catch (error) {
    next(error);
  }
};

// Update settings
// Update settings
const updateSettings = async (req, res, next) => {
  try {
    const { storeName, contactEmail, shippingRate, freeShippingThreshold, razorpayEnabled, codEnabled } = req.body;

    let settings = await prisma.settings.findFirst();
    if (!settings) {
      return next(new AppError('Settings not found. Please initialize them first.', 404));
    }

    const updatedSettings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        storeName,
        contactEmail,
        shippingRate: parseFloat(shippingRate),
        freeShippingThreshold: parseFloat(freeShippingThreshold),
        razorpayEnabled,
        codEnabled
      }
    });

    res.json({ success: true, message: 'Settings updated successfully', data: { settings: updatedSettings } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
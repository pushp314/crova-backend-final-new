const prisma = require('../config/database');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

// Get user orders
const getOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true
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

    const totalOrders = await prisma.order.count({ where });

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

// Get single order
const getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId
      },
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
                    description: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    next(error);
  }
};

// Create order - SECURITY FIX: No stock decrement until payment confirmed
const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return next(new AppError('Order must contain at least one item', 400));
    }

    // COD ABUSE PREVENTION - Check limits early
    if (paymentMethod === 'COD') {
      const { codLimits } = require('../config/redis');
      // We'll calculate total after variant lookup, but do early check for active orders
      const activeOrders = await codLimits.getActiveOrderCount(userId);
      if (activeOrders >= codLimits.MAX_ACTIVE_ORDERS) {
        return next(new AppError(`Maximum ${codLimits.MAX_ACTIVE_ORDERS} active COD orders allowed. Please complete existing orders first.`, 400));
      }

      const cancellations = await codLimits.getCancellationCount(userId);
      if (cancellations >= codLimits.MAX_CANCELLATIONS) {
        return next(new AppError('COD is not available for your account due to previous cancellations. Please use online payment.', 400));
      }
    }

    // Validate items and check stock using variants
    let subtotal = 0;
    const orderItemsData = [];

    // Fetch all variants in a single query (avoid N+1)
    const variantIds = items.map(item => item.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { id: true, name: true, price: true, isActive: true } } }
    });

    // Create a map for quick lookup
    const variantMap = new Map(variants.map(v => [v.id, v]));

    for (const item of items) {
      const variant = variantMap.get(item.variantId);

      if (!variant) {
        return next(new AppError(`Variant ${item.variantId} not found.`, 400));
      }

      if (!variant.product.isActive) {
        return next(new AppError(`Product ${variant.product.name} is no longer available.`, 400));
      }

      if (variant.stock < item.quantity) {
        return next(new AppError(`Insufficient stock for ${variant.product.name} (${variant.size}/${variant.color}). Available: ${variant.stock}`, 400));
      }

      subtotal += Number(variant.product.price) * item.quantity;
      orderItemsData.push({
        variantId: item.variantId,
        quantity: item.quantity,
        price: variant.product.price
      });
    }

    // Calculate shipping and total
    const shippingCost = subtotal > 4999 ? 0 : 50;
    const totalAmount = subtotal + shippingCost;

    // Initialize Razorpay
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const razorpayOptions = {
      amount: Math.round(totalAmount * 100), // Amount in paise
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };

    const razorpayOrder = await razorpayInstance.orders.create(razorpayOptions);

    // Use transaction for atomic order + payment record creation
    const result = await prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          userId,
          subtotal,
          shippingCost,
          totalAmount,
          addressJson: shippingAddress, // Correct field name from schema
          paymentMethod,
          paymentStatus: 'PENDING',
          status: 'PENDING',
          items: { create: orderItemsData }
        },
      });

      // Create payment record with Razorpay order ID
      await tx.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: razorpayOrder.id,
          status: 'PENDING'
        }
      });

      return order;
    });

    // SECURITY: NO STOCK DECREMENT HERE
    // Stock is only decremented after payment is verified in verifyPayment()

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Complete payment to confirm.',
      data: {
        order: {
          id: result.id,
          orderNumber: result.orderNumber,
          totalAmount: result.totalAmount
        },
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Verify Payment - SECURITY FIX: Amount verification + stock decrement
const verifyPayment = async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Payment details are missing.', 400));
  }

  try {
    // Step 1: Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return next(new AppError('Invalid payment signature.', 400));
    }

    // Step 2: Find order via Payment table
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      include: {
        order: {
          include: {
            items: { include: { variant: { include: { product: true } } } }
          }
        }
      }
    });

    if (!payment || !payment.order) {
      return next(new AppError('Order not found.', 404));
    }

    const order = payment.order;

    // Verify order belongs to user
    if (order.userId !== userId) {
      return next(new AppError('Unauthorized.', 403));
    }

    // Prevent double processing
    if (order.paymentStatus === 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: 'Payment already processed.',
        data: { order: { id: order.id, orderNumber: order.orderNumber, status: order.status } }
      });
    }

    // Step 3: Verify amount via Razorpay API (CRITICAL SECURITY CHECK)
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const razorpayPayment = await razorpayInstance.payments.fetch(razorpay_payment_id);
    const expectedAmount = Math.round(Number(order.totalAmount) * 100);

    if (razorpayPayment.amount !== expectedAmount) {
      console.error(`Amount mismatch! Order: ${expectedAmount}, Paid: ${razorpayPayment.amount}`);
      return next(new AppError('Payment amount does not match order total.', 400));
    }

    if (razorpayPayment.status !== 'captured') {
      return next(new AppError(`Payment not captured. Status: ${razorpayPayment.status}`, 400));
    }

    // Step 4: Atomic transaction - update order, payment, and decrement stock
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Verify stock is still available before decrementing
      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId }
        });

        if (!variant || variant.stock < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      // Decrement stock for each item
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Update order status
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'SUCCESS'
        }
      });

      // Update payment record
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: 'SUCCESS'
        }
      });

      return updated;
    });

    // Clear user's cart after successful payment
    await prisma.cartItem.deleteMany({
      where: { cart: { userId: userId } }
    });

    res.json({
      success: true,
      message: 'Payment verified and order confirmed.',
      data: {
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus
        }
      }
    });

  } catch (error) {
    if (error.message.includes('Insufficient stock')) {
      return next(new AppError('Some items are no longer in stock. Please contact support.', 400));
    }
    next(error);
  }
};

// Cancel order
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findFirst({
      where: { id, userId },
      include: { items: true }
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return next(new AppError('Order cannot be cancelled at this stage', 400));
    }

    // Only restore stock if order was paid (stock was decremented)
    if (order.paymentStatus === 'SUCCESS') {
      for (const item of order.items) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } }
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED', paymentStatus: order.paymentStatus === 'SUCCESS' ? 'FAILED' : order.paymentStatus }
    });

    res.json({ success: true, message: 'Order cancelled successfully', data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
};

// Update order status (Admin only)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const updateData = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, message: 'Order status updated successfully', data: { order: updatedOrder } });
  } catch (error) {
    next(error);
  }
};

// Public Track Order (Guest/User)
const trackOrder = async (req, res, next) => {
  try {
    const { orderId, email } = req.body;

    if (!orderId || !email) {
      return next(new AppError('Please provide Order ID and Email', 400));
    }

    // Find order by ID (or Order Number if you prefer)
    // We assume ID here for UUID, or could check orderNumber too
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { orderNumber: orderId } // Flexibly support both
        ]
      },
      include: {
        user: {
          select: { email: true }
        },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { name: true, images: true }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Verify Email
    if (order.user.email.toLowerCase() !== email.toLowerCase()) {
      return next(new AppError('Order details need to match', 404)); // Generic error for security
    }

    // Return limited order details (security best practice)
    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          items: order.items.map(item => ({
            productName: item.variant.product.name,
            quantity: item.quantity,
            image: item.variant.product.images[0]?.imagePath
          }))
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  cancelOrder,
  updateOrderStatus,
  verifyPayment,
  trackOrder
};
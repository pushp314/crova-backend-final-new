/**
 * Payment Controller - Razorpay integration and webhooks
 */
const crypto = require('crypto');
const Razorpay = require('razorpay');
const prisma = require('../config/database');
const { sendOrderConfirmationEmail } = require('../utils/email');
const AppError = require('../utils/AppError');
const { webhookIdempotency } = require('../config/redis');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order
const createRazorpayOrder = async (req, res, next) => {
    try {
        const { orderId } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true },
        });

        if (!order) {
            return next(new AppError('Order not found', 404));
        }

        if (order.userId !== req.user.id) {
            return next(new AppError('Unauthorized', 403));
        }

        if (order.paymentStatus === 'PAID') {
            return next(new AppError('Order already paid', 400));
        }

        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(order.totalAmount * 100), // Amount in paise
            currency: 'INR',
            receipt: order.orderNumber,
            notes: {
                orderId: order.id,
                userId: order.userId,
            },
        });

        // Update order with Razorpay order ID
        await prisma.order.update({
            where: { id: order.id },
            data: { razorpayOrderId: razorpayOrder.id },
        });

        res.json({
            success: true,
            razorpayOrder: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            },
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Verify payment (called from frontend after Razorpay checkout)
const verifyPayment = async (req, res, next) => {
    try {
        const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        // Verify signature
        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            return next(new AppError('Invalid payment signature', 400));
        }

        // Update order
        const order = await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: 'PAID',
                razorpayPaymentId,
                status: 'CONFIRMED',
            },
            include: {
                user: true,
                items: {
                    include: { product: true },
                },
            },
        });

        // Send confirmation email
        try {
            await sendOrderConfirmationEmail(order.user.email, order);
        } catch (emailError) {
            console.error('Failed to send order confirmation email:', emailError);
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Razorpay Webhook Handler - WITH IDEMPOTENCY
const handleWebhook = async (req, res, next) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify webhook signature
        const shasum = crypto.createHmac('sha256', webhookSecret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');

        if (digest !== req.headers['x-razorpay-signature']) {
            // Webhooks might need to respond with 200 even on failure to stop retries, 
            // but for unauthorized/invalid signature, 400 is appropriate.
            // Using AppError might trigger global error handler which sends JSON.
            // Webhook expect 200 OK often. 
            // Let's stick to standard error response but via next() if we want logging, 
            // BUT webhooks are special. If we error with 500, Razorpay retries.
            // If signature is invalid, we should probably return 400 and NOT retry.
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        // Get unique event ID for idempotency
        const eventId = req.body.event_id || `${event}-${payload?.payment?.entity?.id || payload?.order?.entity?.id}`;

        // IDEMPOTENCY CHECK: Skip if already processed
        const alreadyProcessed = await webhookIdempotency.isProcessed(eventId);
        if (alreadyProcessed) {
            console.log(`Webhook ${eventId} already processed, skipping`);
            return res.json({ success: true, message: 'Already processed' });
        }

        // Process webhook
        switch (event) {
            case 'payment.captured':
                await handlePaymentCaptured(payload.payment.entity);
                break;

            case 'payment.failed':
                await handlePaymentFailed(payload.payment.entity);
                break;

            case 'order.paid':
                await handleOrderPaid(payload.order.entity);
                break;

            default:
                console.log('Unhandled webhook event:', event);
        }

        // Mark as processed AFTER successful handling
        await webhookIdempotency.markProcessed(eventId);

        res.json({ success: true });
    } catch (error) {
        // Webhooks should ideally return 200 even on error to stop retries if the error is non-recoverable,
        // but if it IS recoverable (db down), 500 is correct to trigger retry.
        next(error);
    }
};

// Handle payment.captured event - SECURITY FIX: Stock decrement with transaction
const handlePaymentCaptured = async (payment) => {
    try {
        // Find payment record via razorpay order ID
        const paymentRecord = await prisma.payment.findUnique({
            where: { razorpayOrderId: payment.order_id },
            include: {
                order: {
                    include: { items: { include: { variant: true } } }
                }
            }
        });

        if (!paymentRecord || !paymentRecord.order) {
            console.log('Payment record not found for:', payment.order_id);
            return;
        }

        const order = paymentRecord.order;

        // Idempotency check - don't process if already paid
        if (order.paymentStatus === 'SUCCESS') {
            console.log('Order already paid, skipping:', order.id);
            return;
        }

        // Atomic transaction: stock decrement + status update
        await prisma.$transaction(async (tx) => {
            // Decrement stock for each item
            for (const item of order.items) {
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { decrement: item.quantity } }
                });
            }

            // Update order status
            await tx.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'SUCCESS',
                    status: 'CONFIRMED',
                },
            });

            // Update payment record
            await tx.payment.update({
                where: { id: paymentRecord.id },
                data: {
                    razorpayPaymentId: payment.id,
                    status: 'SUCCESS'
                }
            });
        });

        console.log('Payment captured successfully for order:', order.id);
    } catch (error) {
        console.error('Handle payment captured error:', error);
    }
};

// Handle payment.failed event
const handlePaymentFailed = async (payment) => {
    try {
        const paymentRecord = await prisma.payment.findUnique({
            where: { razorpayOrderId: payment.order_id },
            include: { order: true }
        });

        if (paymentRecord && paymentRecord.order) {
            await prisma.$transaction([
                prisma.order.update({
                    where: { id: paymentRecord.order.id },
                    data: {
                        paymentStatus: 'FAILED',
                        status: 'CANCELLED',
                    },
                }),
                prisma.payment.update({
                    where: { id: paymentRecord.id },
                    data: { status: 'FAILED' }
                })
            ]);
        }
    } catch (error) {
        console.error('Handle payment failed error:', error);
    }
};

// Handle order.paid event - SECURITY FIX: Stock decrement with transaction
const handleOrderPaid = async (razorpayOrder) => {
    try {
        const paymentRecord = await prisma.payment.findUnique({
            where: { razorpayOrderId: razorpayOrder.id },
            include: {
                order: {
                    include: {
                        user: true,
                        items: { include: { variant: true } },
                    }
                }
            },
        });

        if (!paymentRecord || !paymentRecord.order) {
            console.log('Order not found for razorpay order:', razorpayOrder.id);
            return;
        }

        const order = paymentRecord.order;

        // Idempotency check
        if (order.paymentStatus === 'SUCCESS') {
            console.log('Order already processed:', order.id);
            return;
        }

        // Atomic transaction: stock decrement + status update
        await prisma.$transaction(async (tx) => {
            // Decrement stock
            for (const item of order.items) {
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: { stock: { decrement: item.quantity } }
                });
            }

            // Update order
            await tx.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'SUCCESS',
                    status: 'CONFIRMED',
                },
            });

            // Update payment
            await tx.payment.update({
                where: { id: paymentRecord.id },
                data: { status: 'SUCCESS' }
            });
        });

        // Send confirmation email
        try {
            await sendOrderConfirmationEmail(order.user.email, order);
        } catch (emailError) {
            console.error('Failed to send order confirmation email:', emailError);
        }
    } catch (error) {
        console.error('Handle order paid error:', error);
    }
};

module.exports = {
    createRazorpayOrder,
    verifyPayment,
    handleWebhook,
};

/**
 * Order Validation Schemas - Zod
 */
const { z } = require('zod');

const orderItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive('Quantity must be positive'),
    variant: z
        .object({
            size: z.string().optional(),
            color: z.string().optional(),
        })
        .optional()
        .nullable(),
});

const createOrderSchema = z.object({
    items: z
        .array(orderItemSchema)
        .min(1, 'Order must have at least one item'),
    addressId: z.string().min(1, 'Address is required'),
    paymentMethod: z.enum(['RAZORPAY', 'COD'], {
        errorMap: () => ({ message: 'Invalid payment method' }),
    }),
    notes: z.string().max(500).optional(),
});

const updateOrderStatusSchema = z.object({
    status: z.enum([
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
    ]),
    trackingNumber: z.string().optional(),
});

const verifyPaymentSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    razorpayPaymentId: z.string().min(1, 'Payment ID is required'),
    razorpayOrderId: z.string().min(1, 'Razorpay Order ID is required'),
    razorpaySignature: z.string().min(1, 'Signature is required'),
});

module.exports = {
    orderItemSchema,
    createOrderSchema,
    updateOrderStatusSchema,
    verifyPaymentSchema,
};

/**
 * User Validation Schemas - Zod
 */
const { z } = require('zod');

const addressSchema = z.object({
    fullName: z
        .string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name must be less than 100 characters'),
    phone: z
        .string()
        .regex(/^[0-9]{10}$/, 'Phone must be 10 digits')
        .optional(),
    street: z
        .string()
        .min(5, 'Street address must be at least 5 characters')
        .max(200, 'Street address must be less than 200 characters'),
    line2: z
        .string()
        .max(100, 'Apartment/Suite must be less than 100 characters')
        .optional(),
    city: z
        .string()
        .min(2, 'City must be at least 2 characters')
        .max(50, 'City must be less than 50 characters'),
    state: z
        .string()
        .max(50, 'State must be less than 50 characters')
        .optional(),
    postalCode: z
        .string()
        .regex(/^[0-9]{6}$/, 'Postal code must be 6 digits'),
    country: z
        .string()
        .default('India'),
    isDefault: z
        .boolean()
        .default(false),
});

const updateAddressSchema = addressSchema.partial();

const cartItemSchema = z.object({
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

const updateCartSchema = z.object({
    items: z.array(cartItemSchema),
});

module.exports = {
    addressSchema,
    updateAddressSchema,
    cartItemSchema,
    updateCartSchema,
};

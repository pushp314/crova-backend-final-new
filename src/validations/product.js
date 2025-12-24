/**
 * Product Validation Schemas - Zod
 */
const { z } = require('zod');

const createProductSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(200, 'Name must be less than 200 characters'),
    description: z
        .string()
        .min(10, 'Description must be at least 10 characters'),
    price: z
        .number()
        .positive('Price must be positive'),
    originalPrice: z
        .number()
        .positive('Original price must be positive')
        .optional()
        .nullable(),
    categoryId: z
        .string()
        .min(1, 'Category is required'),
    stock: z
        .number()
        .int()
        .min(0, 'Stock cannot be negative')
        .default(0),
    isActive: z
        .boolean()
        .default(true),
    isFeatured: z
        .boolean()
        .default(false),
});

const updateProductSchema = createProductSchema.partial();

const createCategorySchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters'),
    description: z
        .string()
        .max(500, 'Description must be less than 500 characters')
        .optional()
        .nullable(),
    isActive: z
        .boolean()
        .default(true),
});

const updateCategorySchema = createCategorySchema.partial();

const productVariantSchema = z.object({
    size: z.string().optional(),
    color: z.string().optional(),
    stock: z.number().int().min(0).default(0),
    sku: z.string().optional(),
});

module.exports = {
    createProductSchema,
    updateProductSchema,
    createCategorySchema,
    updateCategorySchema,
    productVariantSchema,
};

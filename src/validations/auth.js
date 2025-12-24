/**
 * Auth Validation Schemas - Zod
 */
const { z } = require('zod');

const registerSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters'),
    email: z
        .string()
        .email('Invalid email address'),
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters'),
});

const loginSchema = z.object({
    email: z
        .string()
        .email('Invalid email address'),
    password: z
        .string()
        .min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .email('Invalid email address'),
});

const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password must be less than 100 characters'),
});

const updateProfileSchema = z.object({
    name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name must be less than 50 characters')
        .optional(),
    avatar: z
        .string()
        .url('Invalid URL')
        .optional()
        .nullable(),
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
};

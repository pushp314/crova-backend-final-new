const request = require('supertest');
const app = require('../../server'); // We need to export app from server.js
const prisma = require('../../src/config/database');

// Mock Prisma
jest.mock('../../src/config/database', () => ({
    product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    category: {
        findUnique: jest.fn(),
    }
}));

// Mock authentication middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user-id', role: 'ADMIN' };
        next();
    },
    authorize: (...roles) => (req, res, next) => {
        next();
    },
    optionalAuth: (req, res, next) => {
        next();
    },
    requireAdmin: (req, res, next) => {
        next();
    }
}));

// Mock cache middleware
jest.mock('../../src/middleware/cache', () => ({
    cacheMiddleware: () => (req, res, next) => next(),
    invalidateCache: () => (req, res, next) => next()
}));

// Mock upload middleware
jest.mock('../../src/middleware/upload', () => ({
    uploadProductImages: (req, res, next) => next(),
    uploadCategoryImage: (req, res, next) => next(),
    uploadAvatar: (req, res, next) => next(),
    handleUploadError: (err, req, res, next) => next(err),
    upload: {
        array: () => (req, res, next) => next(),
        single: () => (req, res, next) => next(),
        fields: () => (req, res, next) => next()
    }
}));

describe('Product Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/products', () => {
        it('should return all products', async () => {
            const mockProducts = [
                { id: '1', name: 'Test Product 1', price: 100 },
                { id: '2', name: 'Test Product 2', price: 200 },
            ];

            prisma.product.findMany.mockResolvedValue(mockProducts);
            prisma.product.count.mockResolvedValue(2);

            const res = await request(app).get('/api/v1/products');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.products).toHaveLength(2);
            expect(prisma.product.findMany).toHaveBeenCalled();
        });

        it('should handle errors using AppError', async () => {
            prisma.product.findMany.mockRejectedValue(new Error('Database error'));

            const res = await request(app).get('/api/v1/products');

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Database error');
        });
    });

    describe('GET /api/v1/products/:slug', () => {
        it('should return a single product', async () => {
            const mockProduct = { id: '1', name: 'Test Product', slug: 'test-product', isActive: true };

            prisma.product.findUnique.mockResolvedValue(mockProduct);

            const res = await request(app).get('/api/v1/products/test-product');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.product).toEqual(mockProduct);
        });

        it('should return 404 if product not found', async () => {
            prisma.product.findUnique.mockResolvedValue(null);

            const res = await request(app).get('/api/v1/products/non-existent');

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Product not found');
        });
    });
});

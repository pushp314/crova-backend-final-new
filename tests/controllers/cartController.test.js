const request = require('supertest');
const app = require('../../server');
const prisma = require('../../src/config/database');

// Mock Prisma
jest.mock('../../src/config/database', () => ({
    cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    cartItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
    },
    product: {
        findUnique: jest.fn(),
    },
    productVariant: {
        findUnique: jest.fn(),
    }
}));

// Mock authentication middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 'test-user-id' };
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

// Mock cache middleware (needed because server.js loads all routes)
jest.mock('../../src/middleware/cache', () => ({
    cacheMiddleware: () => (req, res, next) => next(),
    invalidateCache: () => (req, res, next) => next()
}));

// Mock upload middleware (needed because server.js loads all routes)
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

describe('Cart Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/cart', () => {
        it('should return empty cart if no cart exists', async () => {
            prisma.cart.findUnique.mockResolvedValue(null);
            prisma.cart.create.mockResolvedValue({ id: 'new-cart', items: [] });

            const res = await request(app).get('/api/v1/cart');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.cart.items).toEqual([]);
        });

        it('should return cart items if cart exists', async () => {
            const mockCart = {
                id: 'cart-123',
                items: [
                    {
                        id: 'item-1',
                        quantity: 2,
                        variantId: 'v1',
                        variant: {
                            id: 'v1',
                            size: 'M',
                            color: 'Red',
                            stock: 50,
                            sku: 'SKU1',
                            product: { id: 'p1', name: 'Product 1', price: 100, images: ['img1'], isActive: true }
                        }
                    }
                ]
            };

            prisma.cart.findUnique.mockResolvedValue(mockCart);

            const res = await request(app).get('/api/v1/cart');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.cart.items).toHaveLength(1);
        });
    });

    describe('POST /api/v1/cart/add', () => {
        it('should add item to cart', async () => {
            const mockVariantId = '11111111-1111-1111-1111-111111111111';
            const mockCartId = '22222222-2222-2222-2222-222222222222';
            const mockVariant = {
                id: mockVariantId,
                stock: 10,
                product: { id: '33333333-3333-3333-3333-333333333333', name: 'Product 1', isActive: true }
            };
            const mockCart = { id: mockCartId };

            // Mock finding variant
            prisma.productVariant.findUnique.mockResolvedValue(mockVariant);

            prisma.cart.findUnique.mockResolvedValue(mockCart);
            prisma.cartItem.findFirst.mockResolvedValue(null);

            prisma.cartItem.create.mockResolvedValue({
                id: '44444444-4444-4444-4444-444444444444',
                cartId: mockCartId,
                variantId: mockVariantId,
                quantity: 1
            });

            // Mock updated cart response
            prisma.cart.findUnique.mockResolvedValueOnce(mockCart)
                .mockResolvedValueOnce({
                    ...mockCart,
                    items: [{
                        id: '44444444-4444-4444-4444-444444444444',
                        variantId: mockVariantId,
                        quantity: 1,
                        variant: {
                            id: mockVariantId,
                            stock: 10,
                            product: mockVariant.product,
                            size: 'M',
                            color: 'Blue',
                            sku: 'SKU123'
                        }
                    }]
                });

            const res = await request(app)
                .post('/api/v1/cart/add')
                .send({ variantId: mockVariantId, quantity: 1 });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Item added to cart');
        });

        it('should return 404 if product variant not found', async () => {
            const mockVariantId = '11111111-1111-1111-1111-111111111111';
            prisma.productVariant.findUnique.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/v1/cart/add')
                .send({ variantId: mockVariantId, quantity: 1 });

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Product variant not found');
        });
    });
});


/**
 * Redis Cache Configuration
 * Caching layer for improved performance
 */
const Redis = require('ioredis');
const logger = require('./logger');

// Create Redis client
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: false,
});

// Connection events
// Connection events
redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
    logger.info('Redis: Connected successfully');
});

redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
    logger.error('Redis: Connection error', err);
});

redis.on('close', () => {
    logger.warn('Redis: Connection closed');
});

// Cache helper functions
const cache = {
    /**
     * Get cached value
     * @param {string} key - Cache key
     * @returns {Promise<any>} - Cached value or null
     */
    async get(key) {
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error(`Cache GET error for key ${key}:`, error);
            return null;
        }
    },

    /**
     * Set cache value
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (default: 1 hour)
     */
    async set(key, value, ttl = 3600) {
        try {
            await redis.set(key, JSON.stringify(value), 'EX', ttl);
        } catch (error) {
            logger.error(`Cache SET error for key ${key}:`, error);
        }
    },

    /**
     * Delete cache key
     * @param {string} key - Cache key
     */
    async del(key) {
        try {
            await redis.del(key);
        } catch (error) {
            logger.error(`Cache DEL error for key ${key}:`, error);
        }
    },

    /**
     * Delete keys by pattern
     * @param {string} pattern - Key pattern (e.g., 'products:*')
     */
    async delByPattern(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        } catch (error) {
            logger.error(`Cache DEL pattern error for ${pattern}:`, error);
        }
    },

    /**
     * Get or set cache (cache-aside pattern)
     * @param {string} key - Cache key
     * @param {Function} fetcher - Function to fetch data if not cached
     * @param {number} ttl - Time to live in seconds
     */
    async getOrSet(key, fetcher, ttl = 3600) {
        try {
            // Try to get from cache
            const cached = await this.get(key);
            if (cached) {
                return cached;
            }

            // Fetch fresh data
            const data = await fetcher();

            // Cache the result
            await this.set(key, data, ttl);

            return data;
        } catch (error) {
            logger.error(`Cache getOrSet error for key ${key}:`, error);
            // Fallback to fetcher on cache error
            return fetcher();
        }
    },

    /**
     * Flush all cache
     */
    async flush() {
        try {
            await redis.flushdb();
            logger.info('Redis: Cache flushed');
        } catch (error) {
            logger.error('Cache FLUSH error:', error);
        }
    },
};

// Cache keys constants
const CACHE_KEYS = {
    PRODUCTS: 'products',
    PRODUCT: (slug) => `product:${slug}`,
    CATEGORIES: 'categories',
    CATEGORY: (slug) => `category:${slug}`,
    BANNERS: 'banners',
    SETTINGS: 'settings',
    USER: (id) => `user:${id}`,
    CART: (userId) => `cart:${userId}`,
    // Webhook idempotency keys
    WEBHOOK: (eventId) => `webhook:${eventId}`,
    // COD tracking keys
    COD_ORDERS: (userId) => `cod:active:${userId}`,
    COD_CANCELLATIONS: (userId) => `cod:cancellations:${userId}`,
};

// Cache TTL constants (in seconds)
const CACHE_TTL = {
    SHORT: 60, // 1 minute
    MEDIUM: 300, // 5 minutes
    LONG: 3600, // 1 hour
    DAY: 86400, // 24 hours
    WEEK: 604800, // 7 days
};

/**
 * Webhook Idempotency Helpers
 */
const webhookIdempotency = {
    /**
     * Check if webhook has been processed
     * @param {string} eventId - Razorpay event ID
     * @returns {Promise<boolean>} - true if already processed
     */
    async isProcessed(eventId) {
        try {
            const exists = await redis.exists(CACHE_KEYS.WEBHOOK(eventId));
            return exists === 1;
        } catch (error) {
            logger.error(`Webhook idempotency check error:`, error);
            return false; // Fail open - process webhook to be safe
        }
    },

    /**
     * Mark webhook as processed
     * @param {string} eventId - Razorpay event ID
     */
    async markProcessed(eventId) {
        try {
            // Store with 24-hour TTL
            await redis.setex(CACHE_KEYS.WEBHOOK(eventId), CACHE_TTL.DAY, '1');
        } catch (error) {
            logger.error(`Webhook mark processed error:`, error);
        }
    },
};

/**
 * COD Abuse Prevention Helpers
 */
const codLimits = {
    MAX_ACTIVE_ORDERS: 3,
    MAX_ORDER_VALUE: 5000, // ₹5,000
    MAX_CANCELLATIONS: 2,

    /**
     * Get active COD order count for user
     * @param {string} userId
     * @returns {Promise<number>}
     */
    async getActiveOrderCount(userId) {
        try {
            const count = await redis.get(CACHE_KEYS.COD_ORDERS(userId));
            return parseInt(count) || 0;
        } catch (error) {
            logger.error(`COD active count error:`, error);
            return 0;
        }
    },

    /**
     * Increment active COD orders
     * @param {string} userId
     */
    async incrementActiveOrders(userId) {
        try {
            const key = CACHE_KEYS.COD_ORDERS(userId);
            await redis.incr(key);
            await redis.expire(key, CACHE_TTL.WEEK);
        } catch (error) {
            logger.error(`COD increment error:`, error);
        }
    },

    /**
     * Decrement active COD orders (on delivery/cancel)
     * @param {string} userId
     */
    async decrementActiveOrders(userId) {
        try {
            const key = CACHE_KEYS.COD_ORDERS(userId);
            const count = await redis.decr(key);
            if (count < 0) await redis.set(key, '0');
        } catch (error) {
            logger.error(`COD decrement error:`, error);
        }
    },

    /**
     * Get cancellation count for user
     * @param {string} userId
     * @returns {Promise<number>}
     */
    async getCancellationCount(userId) {
        try {
            const count = await redis.get(CACHE_KEYS.COD_CANCELLATIONS(userId));
            return parseInt(count) || 0;
        } catch (error) {
            logger.error(`COD cancellation count error:`, error);
            return 0;
        }
    },

    /**
     * Increment cancellation count
     * @param {string} userId
     */
    async incrementCancellations(userId) {
        try {
            const key = CACHE_KEYS.COD_CANCELLATIONS(userId);
            await redis.incr(key);
            await redis.expire(key, CACHE_TTL.WEEK * 4); // 30 days
        } catch (error) {
            logger.error(`COD cancellation increment error:`, error);
        }
    },

    /**
     * Check if user can place COD order
     * @param {string} userId
     * @param {number} orderValue
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async canPlaceCODOrder(userId, orderValue) {
        const activeOrders = await this.getActiveOrderCount(userId);
        if (activeOrders >= this.MAX_ACTIVE_ORDERS) {
            return { allowed: false, reason: `Maximum ${this.MAX_ACTIVE_ORDERS} active COD orders allowed` };
        }

        if (orderValue > this.MAX_ORDER_VALUE) {
            return { allowed: false, reason: `COD not available for orders above ₹${this.MAX_ORDER_VALUE}` };
        }

        const cancellations = await this.getCancellationCount(userId);
        if (cancellations >= this.MAX_CANCELLATIONS) {
            return { allowed: false, reason: 'COD is not available for your account. Please use online payment.' };
        }

        return { allowed: true };
    },
};

module.exports = {
    redis,
    cache,
    CACHE_KEYS,
    CACHE_TTL,
    webhookIdempotency,
    codLimits,
};

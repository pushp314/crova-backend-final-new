/**
 * Redis Cache Middleware
 * Route-level caching for GET requests
 */
const logger = require('../config/logger');

let cache;
try {
    const redis = require('../config/redis');
    cache = redis.cache;
} catch (error) {
    logger.warn('Redis not configured, cache middleware disabled');
    cache = null;
}

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
    return async (req, res, next) => {
        // Skip if cache not available or not GET request
        if (!cache || req.method !== 'GET') {
            return next();
        }

        // Generate cache key
        const key = keyGenerator
            ? keyGenerator(req)
            : `route:${req.originalUrl}`;

        try {
            // Check cache
            const cached = await cache.get(key);
            if (cached) {
                logger.debug(`Cache hit: ${key}`);
                return res.json(cached);
            }

            // Store original json method
            const originalJson = res.json.bind(res);

            // Override json method to cache response
            res.json = (data) => {
                // Only cache successful responses
                if (res.statusCode === 200) {
                    cache.set(key, data, ttl).catch(err => {
                        logger.error('Cache set error:', err);
                    });
                    logger.debug(`Cached: ${key}`);
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error);
            next();
        }
    };
};

/**
 * Invalidate cache by pattern
 * Use after mutations (POST, PUT, DELETE)
 */
const invalidateCache = (pattern) => {
    return async (req, res, next) => {
        if (!cache) {
            return next();
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override to invalidate cache after successful response
        res.json = async (data) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    await cache.delByPattern(pattern);
                    logger.debug(`Cache invalidated: ${pattern}`);
                } catch (error) {
                    logger.error('Cache invalidation error:', error);
                }
            }
            return originalJson(data);
        };

        next();
    };
};

module.exports = {
    cacheMiddleware,
    invalidateCache,
};

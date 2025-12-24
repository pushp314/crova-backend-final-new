/**
 * Zod Validation Middleware
 * Validates request body, query, or params against Zod schemas
 */

/**
 * Validate request body
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                const errors = result.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors,
                });
            }
            req.body = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message,
            });
        }
    };
};

/**
 * Validate query parameters
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.query);
            if (!result.success) {
                const errors = result.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(400).json({
                    success: false,
                    message: 'Invalid query parameters',
                    errors,
                });
            }
            req.query = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message,
            });
        }
    };
};

/**
 * Validate route parameters
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.params);
            if (!result.success) {
                const errors = result.error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                return res.status(400).json({
                    success: false,
                    message: 'Invalid parameters',
                    errors,
                });
            }
            req.params = result.data;
            next();
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.message,
            });
        }
    };
};

module.exports = {
    validateBody,
    validateQuery,
    validateParams,
};

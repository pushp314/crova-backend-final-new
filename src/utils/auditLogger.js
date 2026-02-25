const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Log an administrative action to the AuditLog table
 */
const logAction = async ({ action, resource, resourceId, userId, userName, details, ipAddress }) => {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                resource,
                resourceId: resourceId?.toString(),
                userId,
                userName,
                details: details || {},
                ipAddress
            }
        });
    } catch (error) {
        logger.error(`Failed to create audit log: ${error.message}`);
        // Don't throw - audit logging shouldn't break the main flow
    }
};

module.exports = { logAction };

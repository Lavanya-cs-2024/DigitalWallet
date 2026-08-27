// utils/audit.js
const prisma = require('../config/prisma');

/**
 * Log a security event for audit purposes
 * @param {number} userId - User ID (or null if not authenticated)
 * @param {string} eventType - Type of event (e.g., 'LOGIN', 'REGISTER', 'OTP_VERIFIED')
 * @param {string} description - Detailed description
 * @param {string} ipAddress - IP address of the request
 * @param {string} userAgent - User agent of the request
 * @param {Object} metadata - Additional metadata (optional)
 */
async function logSecurityEvent(
    userId,
    eventType,
    description,
    ipAddress = 'unknown',
    userAgent = 'unknown',
    metadata = {}
) {
    try {
        await prisma.securityEvent.create({
            data: {
                userId: userId || null,
                eventType,
                description,
                ipAddress,
                userAgent,
                metadata: JSON.stringify(metadata)
            }
        });
    } catch (error) {
        // Log error but don't break the flow
        console.error('❌ Failed to log security event:', error.message);
    }
}

/**
 * Get security events for a user
 * @param {number} userId - User ID
 * @param {Object} options - Pagination options
 * @returns {Promise<Array>} - List of security events
 */
async function getSecurityEvents(userId, { limit = 50, offset = 0 } = {}) {
    try {
        return await prisma.securityEvent.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    } catch (error) {
        console.error('❌ Failed to get security events:', error.message);
        return [];
    }
}

module.exports = {
    logSecurityEvent,
    getSecurityEvents
};
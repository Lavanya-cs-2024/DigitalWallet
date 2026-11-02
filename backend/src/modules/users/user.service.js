// ============================================
// USER SERVICE — user search, profile lookup
// ============================================
const prisma = require('../../config/prisma');

const userService = {
    // ============================================
    // SEARCH USERS
    // ============================================
    async searchUsers(query, { excludeUserId = null, excludeGroupId = null, limit = 20 } = {}) {
        if (!query || query.trim().length < 2) {
            const error = new Error('Search query must be at least 2 characters.');
            error.code = 'INVALID_SEARCH_QUERY';
            throw error;
        }

        const q = query.trim().toLowerCase();

        // Where clause — match name OR email OR alias (case-insensitive contains)
        const where = {
            status: 'ACTIVE',
            OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { alias: { contains: q } },
            ],
        };

        // exclude current user
        if (excludeUserId) where.id = { not: excludeUserId };

        // exclude existing group members
        if (excludeGroupId) {
            where.groupMemberships = {
                none: { groupId: excludeGroupId },
            };
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                alias: true,
                profilePicture: true,
            },
            take: limit,
            orderBy: { name: 'asc' },
        });

        return users;
    },
};

module.exports = userService;
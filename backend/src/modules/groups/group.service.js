// ============================================
// GROUP SERVICE — business logic
// ============================================
const prisma = require('../../config/prisma');
const { logSecurityEvent } = require('../../utils/audit');

const groupService = {
    // ============================================
    // CREATE GROUP (creator becomes ADMIN)
    // ============================================
    async createGroup(userId, { name, description }, req = {}) {
        const trimmedName = name.trim();
        const trimmedDesc = description ? description.trim() : null;

        const group = await prisma.$transaction(async (tx) => {
            // Create group
            const g = await tx.group.create({
                data: {
                    name: trimmedName,
                    description: trimmedDesc,
                    createdBy: userId,
                },
            });

            // Creator becomes ADMIN
            await tx.groupMember.create({
                data: {
                    groupId: g.id,
                    userId,
                    role: 'ADMIN',
                },
            });

            return g;
        });

        await logSecurityEvent(
            userId,
            'GROUP_CREATED',
            `Group "${trimmedName}" created (id=${group.id})`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            id: group.id,
            groupId: `grp_${group.id}`,
            name: group.name,
            description: group.description,
            role: 'ADMIN',
            memberCount: 1,
            createdAt: group.createdAt,
        };
    },

    // ============================================
    // LIST MY GROUPS
    // ============================================
    async listMyGroups(userId) {
        const memberships = await prisma.groupMember.findMany({
            where: { userId },
            include: {
                group: {
                    include: {
                        _count: { select: { members: true, expenses: true } },
                        creator: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { joinedAt: 'desc' },
        });

        return memberships.map(m => ({
            id: m.group.id,
            groupId: `grp_${m.group.id}`,
            name: m.group.name,
            description: m.group.description,
            role: m.role,
            memberCount: m.group._count.members,
            expenseCount: m.group._count.expenses,
            creatorName: m.group.creator.name,
            joinedAt: m.joinedAt,
        }));
    },

    // ============================================
    // GET GROUP DETAIL
    // ============================================
    async getGroupDetail(userId, groupId) {
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        });

        if (!membership) {
            const error = new Error('You are not a member of this group.');
            error.code = 'NOT_GROUP_MEMBER';
            throw error;
        }

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: {
                creator: { select: { id: true, name: true, email: true, alias: true } },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true, name: true, email: true,
                                alias: true, profilePicture: true,
                            },
                        },
                    },
                    orderBy: { joinedAt: 'asc' },
                },
                _count: { select: { expenses: true } },
            },
        });

        if (!group) {
            const error = new Error('Group not found.');
            error.code = 'GROUP_NOT_FOUND';
            throw error;
        }

        return {
            id: group.id,
            groupId: `grp_${group.id}`,
            name: group.name,
            description: group.description,
            creator: group.creator,
            myRole: membership.role,
            members: group.members.map(m => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                alias: m.user.alias,
                profilePicture: m.user.profilePicture,
                role: m.role,
                joinedAt: m.joinedAt,
            })),
            memberCount: group.members.length,
            expenseCount: group._count.expenses,
            createdAt: group.createdAt,
        };
    },

    // ============================================
    // UPDATE GROUP (admin only)
    // ============================================
    async updateGroup(userId, groupId, { name, description }, req = {}) {
        await groupService._assertAdmin(userId, groupId);

        const data = {};
        if (name !== undefined) data.name = name.trim();
        if (description !== undefined) {
            data.description = description ? description.trim() : null;
        }

        const updated = await prisma.group.update({
            where: { id: groupId },
            data,
        });

        await logSecurityEvent(
            userId, 'GROUP_UPDATED',
            `Group ${groupId} updated`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            id: updated.id,
            groupId: `grp_${updated.id}`,
            name: updated.name,
            description: updated.description,
        };
    },

    // ============================================
    // ADD MEMBER (admin only)
    // ============================================
    async addMember(userId, groupId, newUserId, req = {}) {
        await groupService._assertAdmin(userId, groupId);

        // Target user must exist and be active
        const targetUser = await prisma.user.findUnique({
            where: { id: newUserId },
            select: { id: true, name: true, status: true },
        });

        if (!targetUser || targetUser.status !== 'ACTIVE') {
            const error = new Error('User not found or not active.');
            error.code = 'USER_NOT_FOUND';
            throw error;
        }

        // Already a member?
        const existing = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId: newUserId } },
        });

        if (existing) {
            const error = new Error('User is already a member of this group.');
            error.code = 'ALREADY_MEMBER';
            throw error;
        }

        await prisma.groupMember.create({
            data: { groupId, userId: newUserId, role: 'MEMBER' },
        });

        await logSecurityEvent(
            userId, 'GROUP_MEMBER_ADDED',
            `User ${newUserId} added to group ${groupId}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            message: `${targetUser.name} added to the group.`,
            memberId: newUserId,
            memberName: targetUser.name,
        };
    },

    // ============================================
    // REMOVE MEMBER (admin only, blocked if user has expenses)
    // ============================================
    async removeMember(userId, groupId, targetUserId, req = {}) {
        await groupService._assertAdmin(userId, groupId);

        if (targetUserId === userId) {
            const error = new Error('Admin cannot remove themselves.');
            error.code = 'CANNOT_REMOVE_SELF';
            throw error;
        }

        // Must be a member
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId: targetUserId } },
        });

        if (!membership) {
            const error = new Error('User is not a member of this group.');
            error.code = 'NOT_GROUP_MEMBER';
            throw error;
        }

        // Block if user has expenses (paid or split)
        const [paidCount, splitCount] = await Promise.all([
            prisma.expense.count({ where: { groupId, paidBy: targetUserId } }),
            prisma.expenseSplit.count({
                where: {
                    userId: targetUserId,
                    expense: { groupId },
                },
            }),
        ]);

        if (paidCount > 0 || splitCount > 0) {
            const error = new Error(
                'Cannot remove member — they have expense history in this group.'
            );
            error.code = 'MEMBER_HAS_EXPENSES';
            throw error;
        }

        await prisma.groupMember.delete({
            where: { groupId_userId: { groupId, userId: targetUserId } },
        });

        await logSecurityEvent(
            userId, 'GROUP_MEMBER_REMOVED',
            `User ${targetUserId} removed from group ${groupId}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return { message: 'Member removed.' };
    },

    // ============================================
    // LEAVE GROUP (member only, blocked if expenses exist)
    // ============================================
    async leaveGroup(userId, groupId, req = {}) {
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        });

        if (!membership) {
            const error = new Error('You are not a member of this group.');
            error.code = 'NOT_GROUP_MEMBER';
            throw error;
        }

        if (membership.role === 'ADMIN') {
            const error = new Error('Admin cannot leave. Transfer admin or delete the group.');
            error.code = 'ADMIN_CANNOT_LEAVE';
            throw error;
        }

        // Block if they have expense history
        const [paidCount, splitCount] = await Promise.all([
            prisma.expense.count({ where: { groupId, paidBy: userId } }),
            prisma.expenseSplit.count({
                where: { userId, expense: { groupId } },
            }),
        ]);

        if (paidCount > 0 || splitCount > 0) {
            const error = new Error('Cannot leave — you have expense history in this group.');
            error.code = 'HAS_EXPENSES';
            throw error;
        }

        await prisma.groupMember.delete({
            where: { groupId_userId: { groupId, userId } },
        });

        await logSecurityEvent(
            userId, 'GROUP_LEFT',
            `User left group ${groupId}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return { message: 'You left the group.' };
    },

    // ============================================
    // DELETE GROUP (admin only)
    // ============================================
    async deleteGroup(userId, groupId, req = {}) {
        await groupService._assertAdmin(userId, groupId);

        await prisma.group.delete({ where: { id: groupId } });

        await logSecurityEvent(
            userId, 'GROUP_DELETED',
            `Group ${groupId} deleted`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return { message: 'Group deleted.' };
    },

    // ============================================
    // HELPER — assert admin
    // ============================================
    async _assertAdmin(userId, groupId) {
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } },
        });

        if (!membership) {
            const error = new Error('You are not a member of this group.');
            error.code = 'NOT_GROUP_MEMBER';
            throw error;
        }

        if (membership.role !== 'ADMIN') {
            const error = new Error('Only the group admin can perform this action.');
            error.code = 'NOT_ADMIN';
            throw error;
        }
    },
};

module.exports = groupService;
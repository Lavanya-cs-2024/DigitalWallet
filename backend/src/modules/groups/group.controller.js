// ============================================
// GROUP CONTROLLER
// ============================================
const groupService = require('./group.service');
const { HTTP_STATUS } = require('../../config/constants');

const groupController = {
    createGroup: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { name, description } = req.body;
            const result = await groupService.createGroup(userId, { name, description }, req);
            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Group created.',
                data: result,
            });
        } catch (error) { next(error); }
    },

    listGroups: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const result = await groupService.listMyGroups(userId);
            res.status(HTTP_STATUS.OK).json({ success: true, data: { groups: result } });
        } catch (error) { next(error); }
    },

    getGroup: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const result = await groupService.getGroupDetail(userId, groupId);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) {
            if (error.code === 'GROUP_NOT_FOUND' || error.code === 'NOT_GROUP_MEMBER') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            next(error);
        }
    },

    updateGroup: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const result = await groupService.updateGroup(userId, groupId, req.body, req);
            res.status(HTTP_STATUS.OK).json({ success: true, message: 'Group updated.', data: result });
        } catch (error) {
            if (['NOT_ADMIN', 'NOT_GROUP_MEMBER'].includes(error.code)) {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            next(error);
        }
    },

    addMember: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const { userId: newUserId } = req.body;
            const result = await groupService.addMember(userId, groupId, newUserId, req);
            res.status(HTTP_STATUS.CREATED).json({ success: true, data: result });
        } catch (error) {
            if (error.code === 'ALREADY_MEMBER' || error.code === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            if (error.code === 'NOT_ADMIN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            next(error);
        }
    },

    removeMember: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const targetUserId = parseInt(req.params.userId);
            const result = await groupService.removeMember(userId, groupId, targetUserId, req);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) {
            if (['NOT_ADMIN', 'MEMBER_HAS_EXPENSES'].includes(error.code)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            if (['NOT_GROUP_MEMBER', 'CANNOT_REMOVE_SELF'].includes(error.code)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            next(error);
        }
    },

    leaveGroup: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const result = await groupService.leaveGroup(userId, groupId, req);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) {
            if (['NOT_GROUP_MEMBER', 'ADMIN_CANNOT_LEAVE', 'HAS_EXPENSES'].includes(error.code)) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            next(error);
        }
    },

    deleteGroup: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const groupId = parseInt(req.params.groupId);
            const result = await groupService.deleteGroup(userId, groupId, req);
            res.status(HTTP_STATUS.OK).json({ success: true, data: result });
        } catch (error) {
            if (error.code === 'NOT_ADMIN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false, message: error.message, code: error.code,
                });
            }
            next(error);
        }
    },
};

module.exports = groupController;
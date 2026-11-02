// ============================================
// USER CONTROLLER — HTTP handlers
// ============================================
const userService = require('./user.service');
const { HTTP_STATUS } = require('../../config/constants');

const userController = {
    // ============================================
    // SEARCH USERS
    // ============================================
    searchUsers: async (req, res, next) => {
        try {
            const { q, excludeGroupId } = req.query;
            const { userId } = req.user;

            const users = await userService.searchUsers(q, {
                excludeUserId: userId,
                excludeGroupId: excludeGroupId ? parseInt(excludeGroupId) : null,
            });

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    users: users.map(u => ({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        alias: u.alias,
                        profilePicture: u.profilePicture,
                    })),
                    total: users.length,
                },
            });
        } catch (error) {
            if (error.code === 'INVALID_SEARCH_QUERY') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: error.code,
                });
            }
            next(error);
        }
    },
};

module.exports = userController;
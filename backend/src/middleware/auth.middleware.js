// middleware/auth.middleware.js
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Protect routes - JWT verification
 * Usage: router.get('/profile', protect, controller.getProfile)
 */
const protect = async (req, res, next) => {
    try {
        // 1. Get token from header
        let token;
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'You are not logged in. Please login to access this resource.',
                code: ERROR_CODES.TOKEN_INVALID
            });
        }

        // 2. Verify token
        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid token. Please login again.',
                code: ERROR_CODES.TOKEN_INVALID
            });
        }

        // 3. Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                emailVerified: true,
                profilePicture: true
            }
        });

        if (!user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                message: 'User no longer exists.',
                code: 'USER_NOT_FOUND'
            });
        }

        // 4. Check if user is active
        if (user.status !== 'ACTIVE') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Your account is not active. Please verify your email.',
                code: ERROR_CODES.PENDING_VERIFICATION
            });
        }

        // 5. Attach user to request
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Restrict access to specific roles
 * Usage: router.delete('/user/:id', protect, restrictTo('ADMIN'), controller.deleteUser)
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // Add role-based authorization logic here
        // This will be extended when you add role-based access
        next();
    };
};

module.exports = { protect, restrictTo };
// modules/auth/google.service.js
const { google } = require('googleapis');
const prisma = require('../../config/prisma');
const { generateTokens } = require('../../utils/jwt');
const { USER_STATUS } = require('../../config/constants');

// ============================================
// Create OAuth2 Client
// ============================================
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const googleService = {
    // ============================================
    // 1. Generate Google Auth URL
    // ============================================
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    },

    // ============================================
    // 2. Exchange Code for Tokens
    // ============================================
    async getTokens(code) {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        return tokens;
    },

    // ============================================
    // 3. Get User Info from Google
    // ============================================
    async getUserInfo(tokens) {
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const { data } = await oauth2.userinfo.get();
        return data;
    },

    // ============================================
    // 4. Handle Google Login
    // ============================================
    async handleGoogleLogin(googleUser, req = {}) {
        const { email, name, picture, id: googleId } = googleUser;

        if (!email) {
            throw new Error('Google account has no email');
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find existing user
        let user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { wallet: true }
        });

        // User exists with same email
        if (user) {
            // Update Google info if not set
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId,
                        authProvider: 'google',
                        emailVerified: true,
                        status: USER_STATUS.ACTIVE,
                        profilePicture: user.profilePicture || picture
                    }
                });
            }

            // Activate account if pending (Google already verified email)
            if (user.status === USER_STATUS.PENDING_VERIFICATION) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        status: USER_STATUS.ACTIVE,
                        emailVerified: true
                    }
                });
            }
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    name: name || 'Google User',
                    email: normalizedEmail,
                    googleId,
                    authProvider: 'google',
                    profilePicture: picture,
                    emailVerified: true,
                    status: USER_STATUS.ACTIVE,
                    loginCount: 0
                }
            });

            // Reload user with wallet
            user = await prisma.user.findUnique({
                where: { id: user.id },
                include: { wallet: true }
            });
        }

        // Update login count
        const loginCount = (user.loginCount || 0) + 1;
        await prisma.user.update({
            where: { id: user.id },
            data: { loginCount }
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens({
            userId: user.id,
            email: user.email
        });

        // Log security event (if your logSecurityEvent allows)
        try {
            const { logSecurityEvent } = require('../../utils/audit');
            await logSecurityEvent(
                user.id,
                'GOOGLE_LOGIN_SUCCESS',
                `User ${user.email} logged in via Google`,
                req.ip || 'unknown',
                req.headers?.['user-agent'] || 'unknown'
            );
        } catch (e) {
            console.warn('Audit log skipped:', e.message);
        }

        return {
            user,
            accessToken,
            refreshToken,
            isNewUser: !user.googleId, // true if just registered
            loginCount
        };
    }
};

module.exports = googleService;
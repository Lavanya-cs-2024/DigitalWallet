// modules/auth/auth.controller.js
const authService = require('./auth.service');
const { HTTP_STATUS, ERROR_CODES } = require('../../config/constants');

const authController = {
    // =============================================
    // REGISTER
    // =============================================
    register: async (req, res, next) => {
        try {
            const { name, email, mobile, password } = req.body;
            const result = await authService.register(
                { name, email, mobile, password },
                req
            );
            
            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Registration successful. Please verify your email with the OTP sent.',
                data: {
                    userId: result.userId,
                    email: result.email,
                    name: result.name,
                    status: result.status,
                    requiresVerification: true
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // =============================================
    // VERIFY EMAIL
    // =============================================
    verifyEmail: async (req, res, next) => {
        try {
            const { email, otp } = req.body;
            const result = await authService.verifyEmail(
                { email, otp },
                req
            );
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: result.message || 'Email verified successfully. You can now log in.',
                data: {
                    userId: result.userId,
                    email: result.email,
                    status: result.status,
                    emailVerified: result.emailVerified
                }
            });
        } catch (error) {
            // Handle specific errors for better UX
            if (error.code === ERROR_CODES.OTP_EXPIRED) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: error.code,
                    action: 'RESEND_OTP'
                });
            }
            if (error.message.includes('Too many verification attempts')) {
                return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                    success: false,
                    message: error.message,
                    code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
                    action: 'WAIT_AND_RETRY'
                });
            }
            if (error.message.includes('Maximum verification attempts reached')) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: ERROR_CODES.MAX_ATTEMPTS_REACHED,
                    action: 'RESEND_OTP'
                });
            }
            next(error);
        }
    },

    // =============================================
    // RESEND OTP
    // =============================================
    resendOTP: async (req, res, next) => {
        try {
            const { email } = req.body;
            const result = await authService.resendOTP(
                { email },
                req
            );
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: result.message || 'New OTP sent to your email.',
                data: {
                    email: result.email,
                    expiresIn: '2 minutes',
                    resendCooldown: '30 seconds'
                }
            });
        } catch (error) {
            if (error.message.includes('Please wait')) {
                return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                    success: false,
                    message: error.message,
                    code: ERROR_CODES.COOLDOWN_ACTIVE,
                    action: 'WAIT_AND_RETRY'
                });
            }
            if (error.message.includes('Too many OTP requests')) {
                return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                    success: false,
                    message: error.message,
                    code: ERROR_CODES.RESEND_LIMIT_EXCEEDED,
                    action: 'WAIT_10_MINUTES'
                });
            }
            next(error);
        }
    },

        
    // =============================================
    // GOOGLE OAUTH — Redirect to Google
    // =============================================
    googleAuth: (req, res) => {
        const authUrl = googleService.getAuthUrl();
        res.redirect(authUrl);
    },

    // =============================================
    // GOOGLE OAUTH — Callback
    // =============================================
    googleCallback: async (req, res, next) => {
        try {
            const { code, error } = req.query;

            // Handle Google error
            if (error) {
                return res.redirect(
                    `${process.env.FRONTEND_URL}/pages/login.html?error=google_failed`
                );
            }

            if (!code) {
                return res.redirect(
                    `${process.env.FRONTEND_URL}/pages/login.html?error=no_code`
                );
            }

            // Exchange code for tokens
            const tokens = await googleService.getTokens(code);

            // Get user info from Google
            const googleUser = await googleService.getUserInfo(tokens);

            // Handle login/registration
            const result = await googleService.handleGoogleLogin(googleUser, req);

            // Redirect to frontend with tokens
            const redirectUrl = new URL(`${process.env.FRONTEND_URL}/pages/login.html`);
            redirectUrl.searchParams.set('auth', 'success');
            redirectUrl.searchParams.set('accessToken', result.accessToken);
            redirectUrl.searchParams.set('refreshToken', result.refreshToken);
            redirectUrl.searchParams.set('userId', result.user.id);

            res.redirect(redirectUrl.toString());
        } catch (error) {
            console.error('Google OAuth error:', error);
            res.redirect(
                `${process.env.FRONTEND_URL}/pages/login.html?error=google_failed`
            );
        }
    },

    // =============================================
    // LOGIN
    // =============================================
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const result = await authService.login(
                { email, password },
                req
            );
            
            // Handle PENDING_VERIFICATION
            if (result.code === ERROR_CODES.PENDING_VERIFICATION || 
                result.message?.includes('PENDING_VERIFICATION')) {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    message: 'Please complete your email verification.',
                    code: ERROR_CODES.PENDING_VERIFICATION,
                    action: 'VERIFY_EMAIL'
                });
            }

            // Handle 2FA required
            if (result.require2FA) {
                return res.status(HTTP_STATUS.OK).json({
                    success: true,
                    message: '2FA verification required',
                    data: {
                        userId: result.userId,
                        email: result.email,
                        require2FA: true,
                        tempToken: result.tempToken
                    }
                });
            }

            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: result.user.id,
                        name: result.user.name,
                        email: result.user.email,
                        mobile: result.user.mobile,
                        status: result.user.status,
                        emailVerified: result.user.emailVerified,
                        profilePicture: result.user.profilePicture
                    },
                    tokens: {
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                        expiresIn: '7d'
                    },
                    wallet: result.wallet ? {
                        id: result.wallet.id,
                        balance: result.wallet.balance,
                        currency: 'INR'
                    } : null,
                    show2FAPrompt: result.show2FAPrompt || false,
                    loginCount: result.loginCount || 0,
                    isFirstLogin: result.isFirstLogin || false
                }
            });
        } catch (error) {
            next(error);
        }
    },

// =============================================
// FORGOT PASSWORD
// =============================================
forgotPassword: async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword({ email }, req);

        // ✅ If user doesn't exist
        if (result.userExists === false) {
            return res.status(HTTP_STATUS.OK).json({
                success: false,  // ✅ success: false → no redirect
                message: 'If an account exists for this email, a password reset code has been sent.',
                code: 'EMAIL_SENT_GENERIC',  // Generic code
                action: 'CHECK_EMAIL'
            });
        }

        // ✅ If user exists → send success
        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: result.message || 'Password reset code sent to your email.',
            data: { email: result.email }
        });

    } catch (error) {
        // Handle PENDING_VERIFICATION
        if (error.code === ERROR_CODES.PENDING_VERIFICATION) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                message: 'Please verify your email first.',
                code: ERROR_CODES.PENDING_VERIFICATION,
                action: 'VERIFY_EMAIL'
            });
        }
        next(error);
    }
},

    // =============================================
    // RESET PASSWORD
    // =============================================
    resetPassword: async (req, res, next) => {
        try {
            const { email, otp, newPassword } = req.body;
            const result = await authService.resetPassword(
                { email, otp, newPassword },
                req
            );
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Password reset successful. Please login with your new password.',
                data: {
                    userId: result.userId,
                    email: result.email
                }
            });
        } catch (error) {
            if (error.code === ERROR_CODES.OTP_EXPIRED) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: error.code,
                    action: 'RESEND_OTP'
                });
            }
            next(error);
        }
    },

    // =============================================
    // GET CURRENT USER
    // =============================================
    getCurrentUser: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const result = await authService.getCurrentUser({ userId });
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    user: result.user,
                    wallet: result.wallet,
                    twoFA: result.twoFA
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // =============================================
    // CHANGE PASSWORD
    // =============================================
    changePassword: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { currentPassword, newPassword } = req.body;
            
            await authService.changePassword(
                { userId, currentPassword, newPassword },
                req
            );
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    // =============================================
    // LOGOUT
    // =============================================
    logout: async (req, res, next) => {
        try {
            const { userId } = req.user;
            await authService.logout({ userId }, req);
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    // =============================================
    // REFRESH TOKEN
    // =============================================
    refreshToken: async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshToken({ refreshToken });
            
            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: {
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken,
                    expiresIn: '7d'
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // =============================================
    // UPDATE PROFILE
    // =============================================
    updateProfile: async (req, res, next) => {
        try {
            const { userId } = req.user;
            const { mobile, state } = req.body;

            const updated = await authService.updateProfile(
                { userId, mobile, state },
                req
            );

            res.status(HTTP_STATUS.OK).json({
                success: true,
                message: 'Profile updated successfully.',
                data: { user: updated }
            });
        } catch (error) {
            if (error.code === 'INVALID_MOBILE' || error.code === 'MOBILE_EXISTS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: error.message,
                    code: error.code
                });
            }
            next(error);
        }
    }
    
};

module.exports = authController;

const googleService = require('./google.service');

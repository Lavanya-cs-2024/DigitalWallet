// modules/auth/auth.service.js
const prisma = require('../../config/prisma');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateTokens } = require('../../utils/jwt');
const { sendEmail, getOTPEmailTemplate, getPasswordResetTemplate, getWelcomeTemplate } = require('../../utils/email');
const { logSecurityEvent } = require('../../utils/audit');
const { 
    OTP_CONFIG, 
    USER_STATUS, 
    OTP_TYPES, 
    ERROR_CODES 
} = require('../../config/constants');

const authService = {
    // =============================================
    // REGISTER - Complete Registration Flow
    // =============================================
    async register(userData, req = {}) {
        const { name, email, mobile, password } = userData;

        // Check existing email
        const existingEmail = await prisma.user.findUnique({ 
            where: { email } 
        });
        
        if (existingEmail) {
            const error = new Error('Email already exists. Please use another email address.');
            error.code = ERROR_CODES.EMAIL_EXISTS;
            throw error;
        }

        // Check existing mobile
        const existingMobile = await prisma.user.findUnique({ 
            where: { mobile } 
        });
        
        if (existingMobile) {
            const error = new Error('Mobile number already registered.');
            error.code = ERROR_CODES.MOBILE_EXISTS;
            throw error;
        }

        // Hash password
        const passwordHash = await hashPassword(password);
        
        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                mobile,
                passwordHash,
                status: USER_STATUS.PENDING_VERIFICATION,
                emailVerified: false
            }
        });

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

        // Invalidate old OTPs
        await prisma.oTP.updateMany({
            where: {
                userId: user.id,
                type: OTP_TYPES.EMAIL_VERIFICATION,
                used: false
            },
            data: { used: true }
        });

        // Store OTP
        await prisma.oTP.create({
            data: {
                userId: user.id,
                code: otpCode,
                type: OTP_TYPES.EMAIL_VERIFICATION,
                expiresAt,
                used: false,
                attempts: 0,
                resendCount: 0
            }
        });

        // Send OTP email
        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Email - Digital Wallet',
                html: getOTPEmailTemplate(otpCode, name)
            });
            console.log(`📧 OTP sent to ${email}`);
        } catch (error) {
            console.error('❌ Failed to send OTP email:', error.message);
        }

        // Log security event
        await logSecurityEvent(
            user.id,
            'USER_REGISTERED',
            `User ${email} registered successfully`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            userId: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
            message: 'OTP sent to your email. Please verify within 2 minutes.'
        };
    },

    // =============================================
    // VERIFY EMAIL - Complete OTP Verification
    // =============================================
    async verifyEmail({ email, otp }, req = {}) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                otps: {
                    where: {
                        type: OTP_TYPES.EMAIL_VERIFICATION,
                        used: false
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!user) {
            throw new Error('User not found.');
        }

        if (user.status === USER_STATUS.ACTIVE) {
            throw new Error('Email already verified. Please login.');
        }

        if (user.otps.length === 0) {
            throw new Error('No active OTP found. Please request a new OTP.');
        }

        const otpRecord = user.otps[0];

        // Check expiry
        if (otpRecord.expiresAt < new Date()) {
            const error = new Error('OTP has expired. Please request a new one.');
            error.code = ERROR_CODES.OTP_EXPIRED;
            throw error;
        }

        // Check if already used
        if (otpRecord.used) {
            throw new Error('OTP has already been used. Please request a new one.');
        }

        // Rate limiting - Max 5 attempts per minute
        const recentAttempts = await prisma.oTP.count({
            where: {
                userId: user.id,
                type: OTP_TYPES.EMAIL_VERIFICATION,
                createdAt: { 
                    gt: new Date(Date.now() - OTP_CONFIG.VERIFICATION_WINDOW_MINUTES * 60 * 1000) 
                }
            }
        });

        if (recentAttempts >= OTP_CONFIG.MAX_VERIFICATION_ATTEMPTS) {
            throw new Error('Too many verification attempts. Please wait a minute and try again.');
        }

        // Check OTP
        if (otpRecord.code !== otp) {
            await prisma.oTP.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });

            const newAttemptCount = (otpRecord.attempts || 0) + 1;
            const remainingAttempts = OTP_CONFIG.MAX_VERIFICATION_ATTEMPTS - newAttemptCount;
            
            if (remainingAttempts <= 0) {
                throw new Error('Maximum verification attempts reached. Please request a new OTP.');
            }
            
            throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
        }

        // Complete verification
        await prisma.$transaction([
            prisma.oTP.update({
                where: { id: otpRecord.id },
                data: { used: true }
            }),
            prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    status: USER_STATUS.ACTIVE
                }
            }),
            prisma.wallet.create({
                data: {
                    userId: user.id,
                    balance: 0
                }
            })
        ]);

        // Send welcome email
        try {
            await sendEmail({
                to: email,
                subject: 'Welcome to Digital Wallet!',
                html: getWelcomeTemplate(user.name)
            });
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error.message);
        }

        // Log security event
        await logSecurityEvent(
            user.id,
            'EMAIL_VERIFIED',
            `Email ${user.email} verified successfully`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            userId: user.id,
            email: user.email,
            status: USER_STATUS.ACTIVE,
            emailVerified: true,
            message: 'Email verified successfully. You can now log in.'
        };
    },

    // =============================================
    // RESEND OTP - Complete Resend Flow
    // =============================================
    async resendOTP({ email }, req = {}) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                otps: {
                    where: { type: OTP_TYPES.EMAIL_VERIFICATION },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!user) {
            throw new Error('User not found.');
        }

        if (user.status === USER_STATUS.ACTIVE) {
            throw new Error('Email already verified. Please login.');
        }

        const lastOTP = user.otps[0];

        // Check 30-second cooldown
        if (lastOTP) {
            const timeSinceLastResend = Date.now() - new Date(lastOTP.createdAt).getTime();
            if (timeSinceLastResend < OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000) {
                const remainingSeconds = Math.ceil(
                    (OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000 - timeSinceLastResend) / 1000
                );
                throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP.`);
            }
        }

        // Check resend limit - Max 3 resends per 10 minutes
        const resendsInLast10Min = await prisma.oTP.count({
            where: {
                userId: user.id,
                type: OTP_TYPES.EMAIL_VERIFICATION,
                createdAt: { 
                    gt: new Date(Date.now() - 10 * 60 * 1000) 
                }
            }
        });

        if (resendsInLast10Min >= OTP_CONFIG.MAX_RESENDS_PER_10MIN) {
            throw new Error('Too many OTP requests. Please try again after 10 minutes.');
        }

        // Generate new OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

        // Invalidate old OTP
        await prisma.oTP.updateMany({
            where: {
                userId: user.id,
                type: OTP_TYPES.EMAIL_VERIFICATION,
                used: false
            },
            data: { used: true }
        });

        // Store new OTP
        await prisma.oTP.create({
            data: {
                userId: user.id,
                code: otpCode,
                type: OTP_TYPES.EMAIL_VERIFICATION,
                expiresAt,
                used: false,
                attempts: 0,
                resendCount: resendsInLast10Min + 1
            }
        });

        // Send new OTP email
        try {
            await sendEmail({
                to: email,
                subject: 'New OTP - Digital Wallet',
                html: getOTPEmailTemplate(otpCode, user.name)
            });
        } catch (error) {
            console.error('❌ Failed to send OTP email:', error.message);
        }

        // Log security event
        await logSecurityEvent(
            user.id,
            'OTP_RESENT',
            `OTP resent to ${user.email}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            email: user.email,
            message: 'New OTP sent to your email. Valid for 2 minutes.'
        };
    },

    // =============================================
    // LOGIN - Complete Login Flow
    // =============================================
    async login({ email, password }, req = {}) {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { 
                wallet: true,
                twoFA: true
            }
        });

        if (!user) {
            throw new Error('Invalid email or password.');
        }

        // Check account status
        if (user.status === USER_STATUS.PENDING_VERIFICATION) {
            const error = new Error('Please complete your email verification.');
            error.code = ERROR_CODES.PENDING_VERIFICATION;
            throw error;
        }

        if (user.status !== USER_STATUS.ACTIVE) {
            throw new Error('Account is not active. Please contact support.');
        }

        // Verify password
        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid email or password.');
        }

        // Update login count
        const loginCount = (user.loginCount || 0) + 1;
        await prisma.user.update({
            where: { id: user.id },
            data: { loginCount }
        });

        // Log security event
        await logSecurityEvent(
            user.id,
            'LOGIN_SUCCESS',
            `User ${user.email} logged in successfully`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        // Check 2FA status
        const twoFA = user.twoFA;
        const isWithinFirst3 = loginCount <= 3;

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens({
            userId: user.id,
            email: user.email
        });

        const { passwordHash: _, ...userWithoutPassword } = user;

        // If 2FA is enabled, require 2FA verification
        if (twoFA && twoFA.isEnabled) {
            return {
                require2FA: true,
                userId: user.id,
                email: user.email,
                message: '2FA verification required',
                tempToken: accessToken
            };
        }

        // Show 2FA prompt on first 3 logins
        const show2FAPrompt = isWithinFirst3 && !twoFA?.isEnabled;

        return {
            require2FA: false,
            user: userWithoutPassword,
            wallet: user.wallet,
            accessToken,
            refreshToken,
            show2FAPrompt,
            loginCount,
            isFirstLogin: loginCount === 1,
            message: 'Login successful'
        };
    },

    // =============================================
    // FORGOT PASSWORD - Complete Flow
    // =============================================
    async forgotPassword({ email }, req = {}) {
        const user = await prisma.user.findUnique({ 
            where: { email } 
        });

        // Don't reveal if email exists (security)
        if (!user) {
            return {
                message: 'If an account exists for this email, a password reset code has been sent.'
            };
        }

        // Check account status
        if (user.status === USER_STATUS.PENDING_VERIFICATION) {
            const error = new Error('Please verify your email first.');
            error.code = ERROR_CODES.PENDING_VERIFICATION;
            throw error;
        }

        // Generate OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

        // Invalidate old OTPs
        await prisma.oTP.updateMany({
            where: {
                userId: user.id,
                type: OTP_TYPES.PASSWORD_RESET,
                used: false
            },
            data: { used: true }
        });

        // Store OTP
        await prisma.oTP.create({
            data: {
                userId: user.id,
                code: otpCode,
                type: OTP_TYPES.PASSWORD_RESET,
                expiresAt,
                used: false,
                attempts: 0,
                resendCount: 0
            }
        });

        // Send password reset email
        try {
            await sendEmail({
                to: email,
                subject: 'Reset Your Password - Digital Wallet',
                html: getPasswordResetTemplate(otpCode, user.name)
            });
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error.message);
        }

        // Log security event
        await logSecurityEvent(
            user.id,
            'PASSWORD_RESET_REQUESTED',
            `Password reset requested for ${user.email}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            email: user.email,
            message: 'If an account exists for this email, a password reset code has been sent.'
        };
    },

    // =============================================
    // RESET PASSWORD - Complete Flow
    // =============================================
    async resetPassword({ email, otp, newPassword }, req = {}) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                otps: {
                    where: {
                        type: OTP_TYPES.PASSWORD_RESET,
                        used: false
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!user) {
            throw new Error('Invalid request.');
        }

        if (user.otps.length === 0) {
            throw new Error('No valid reset OTP found. Please request a new one.');
        }

        const otpRecord = user.otps[0];

        // Check expiry
        if (otpRecord.expiresAt < new Date()) {
            const error = new Error('OTP has expired. Please request a new one.');
            error.code = ERROR_CODES.OTP_EXPIRED;
            throw error;
        }

        // Check OTP
        if (otpRecord.code !== otp) {
            await prisma.oTP.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            throw new Error('Invalid OTP. Please try again.');
        }

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update password and mark OTP as used
        await prisma.$transaction([
            prisma.oTP.update({
                where: { id: otpRecord.id },
                data: { used: true }
            }),
            prisma.user.update({
                where: { id: user.id },
                data: { passwordHash }
            })
        ]);

        // Log security event
        await logSecurityEvent(
            user.id,
            'PASSWORD_RESET_SUCCESS',
            `Password reset successful for ${user.email}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return {
            userId: user.id,
            email: user.email,
            message: 'Password reset successful. Please login with your new password.'
        };
    },

    // =============================================
    // GET CURRENT USER
    // =============================================
    async getCurrentUser({ userId }) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { 
                wallet: true,
                twoFA: {
                    select: {
                        isEnabled: true
                    }
                }
            }
        });

        if (!user) {
            throw new Error('User not found.');
        }

        const { passwordHash: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword,
            wallet: user.wallet,
            twoFA: user.twoFA
        };
    },

    // =============================================
    // CHANGE PASSWORD
    // =============================================
    async changePassword({ userId, currentPassword, newPassword }, req = {}) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found.');
        }

        const isValid = await comparePassword(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new Error('Current password is incorrect.');
        }

        const passwordHash = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash }
        });

        // Log security event
        await logSecurityEvent(
            userId,
            'PASSWORD_CHANGED',
            `Password changed for user ${user.email}`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return { success: true };
    },

    // =============================================
    // LOGOUT
    // =============================================
    async logout({ userId }, req = {}) {
        // Log security event
        await logSecurityEvent(
            userId,
            'LOGOUT',
            `User logged out`,
            req.ip || 'unknown',
            req.headers?.['user-agent'] || 'unknown'
        );

        return { success: true };
    },

    // =============================================
    // REFRESH TOKEN
    // =============================================
    async refreshToken({ refreshToken }) {
        // Verify refresh token
        const { verifyToken } = require('../../utils/jwt');
        const decoded = verifyToken(refreshToken);
        
        if (!decoded) {
            throw new Error('Invalid refresh token.');
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            throw new Error('User not found.');
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens({
            userId: user.id,
            email: user.email
        });

        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    }
};

module.exports = authService;
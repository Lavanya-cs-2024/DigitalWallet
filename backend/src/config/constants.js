// src/config/constants.js
module.exports = {
    // ============================================
    // OTP Configuration
    // ============================================
    OTP_CONFIG: {
        LENGTH: 6,
        EXPIRY_MINUTES: 2,
        RESEND_COOLDOWN_SECONDS: 30,
        MAX_RESENDS_PER_10MIN: 3,
        MAX_VERIFICATION_ATTEMPTS: 5,
        VERIFICATION_WINDOW_MINUTES: 1
    },

    // ============================================
    // Password Configuration
    // ============================================
    PASSWORD_CONFIG: {
        MIN_LENGTH: 8,
        MAX_LENGTH: 50,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBER: true,
        REQUIRE_SPECIAL: true
    },

    // ============================================
    // JWT Configuration
    // ============================================
    JWT_CONFIG: {
        ACCESS_TOKEN_EXPIRY: '7d',
        REFRESH_TOKEN_EXPIRY: '30d'
    },

    // ============================================
    // 2FA Configuration
    // ============================================
    TWOFA_CONFIG: {
        MAX_ATTEMPTS: 5,
        LOCK_DURATION_MINUTES: 10,
        RATE_LIMIT_PER_MINUTE: 5,
        FIRST_LOGIN_PROMPT_COUNT: 3
    },

    // ============================================
    // User Status
    // ============================================
    USER_STATUS: {
        PENDING_VERIFICATION: 'PENDING_VERIFICATION',
        ACTIVE: 'ACTIVE'
    },

    // ============================================
    // OTP Types
    // ============================================
    OTP_TYPES: {
        EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
        PASSWORD_RESET: 'PASSWORD_RESET'
    },

    // ============================================
    // HTTP Status Codes
    // ============================================
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        TOO_MANY_REQUESTS: 429,
        INTERNAL_SERVER_ERROR: 500
    },

    // ============================================
    // Error Codes
    // ============================================
    ERROR_CODES: {
        OTP_EXPIRED: 'OTP_EXPIRED',
        OTP_INVALID: 'OTP_INVALID',
        RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
        MAX_ATTEMPTS_REACHED: 'MAX_ATTEMPTS_REACHED',
        COOLDOWN_ACTIVE: 'COOLDOWN_ACTIVE',
        RESEND_LIMIT_EXCEEDED: 'RESEND_LIMIT_EXCEEDED',
        PENDING_VERIFICATION: 'PENDING_VERIFICATION',
        TWOFA_LOCKED: '2FA_LOCKED',
        INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
        TOKEN_EXPIRED: 'TOKEN_EXPIRED',
        TOKEN_INVALID: 'TOKEN_INVALID',
        USER_NOT_FOUND: 'USER_NOT_FOUND',
        EMAIL_EXISTS: 'EMAIL_EXISTS',
        MOBILE_EXISTS: 'MOBILE_EXISTS'
    },

    // ============================================
    // API Rate Limits - ADD THIS SECTION
    // ============================================
    RATE_LIMITS: {
        REGISTER: { windowMs: 15 * 60 * 1000, max: 5 },
        LOGIN: { windowMs: 15 * 60 * 1000, max: 10 },
        VERIFY_OTP: { windowMs: 60 * 1000, max: 5 },
        RESEND_OTP: { windowMs: 30 * 1000, max: 3 },
        FORGOT_PASSWORD: { windowMs: 15 * 60 * 1000, max: 3 },
        RESET_PASSWORD: { windowMs: 60 * 1000, max: 3 },
        TWOFA_VERIFY: { windowMs: 60 * 1000, max: 5 }
    },

    // ============================================
    // Email Configuration
    // ============================================
    EMAIL: {
        FROM: process.env.SMTP_FROM || 'noreply@digitalwallet.com',
        OTP_SUBJECT: 'Verify Your Email - Digital Wallet',
        PASSWORD_RESET_SUBJECT: 'Reset Your Password - Digital Wallet',
        WELCOME_SUBJECT: 'Welcome to Digital Wallet'
    }
};
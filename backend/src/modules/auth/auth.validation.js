// ============================================
// AUTH VALIDATION - Complete File
// ============================================

const { body } = require('express-validator');

// ============================================
// 1. REGISTRATION VALIDATION
// ============================================
const registerSchema = [
    // ============================================
    // NAME VALIDATION
    // ============================================
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .isLength({ max: 100 })
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail({ gmail_remove_dots: false }),

    // ============================================
    // MOBILE VALIDATION
    // ============================================
    body('mobile')
        .trim()
        .notEmpty().withMessage('Mobile number is required')
        .isLength({ min: 10, max: 10 })
        .withMessage('Mobile number must be exactly 10 digits')
        .matches(/^[0-9]{10}$/)
        .withMessage('Mobile number must contain only digits'),

    // ============================================
    // PASSWORD VALIDATION
    // ============================================
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8, max: 50 })
        .withMessage('Password must be between 8 and 50 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character')
        .not().matches(/\s/)
        .withMessage('Password cannot contain spaces'),

    // ============================================
    // CONFIRM PASSWORD VALIDATION
    // ============================================
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .isLength({ max: 50 })
        .withMessage('Confirm password must be less than 50 characters')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// ============================================
// 2. LOGIN VALIDATION
// ============================================
const loginSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .isLength({ max: 100 })
        .withMessage('Email must be less than 100 characters'),

    // ============================================
    // PASSWORD VALIDATION
    // ============================================
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ max: 50 })
        .withMessage('Password must be less than 50 characters')
];

// ============================================
// 3. EMAIL VERIFICATION VALIDATION
// ============================================
const verifyEmailSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .isLength({ max: 100 })
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail(),

    // ============================================
    // OTP VALIDATION
    // ============================================
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be exactly 6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers')
];

// ============================================
// 4. RESEND OTP VALIDATION
// ============================================
const resendOTPSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .isLength({ max: 100 })
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail()
];

// ============================================
// 5. FORGOT PASSWORD VALIDATION
// ============================================
const forgotPasswordSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .isLength({ max: 100 })
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail()
];

// ============================================
// 6. RESET PASSWORD VALIDATION
// ============================================
const resetPasswordSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .isLength({ max: 100 })
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail(),

    // ============================================
    // OTP VALIDATION
    // ============================================
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be exactly 6 digits')
        .isNumeric()
        .withMessage('OTP must contain only numbers'),

    // ============================================
    // NEW PASSWORD VALIDATION
    // ============================================
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8, max: 50 })
        .withMessage('Password must be between 8 and 50 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character'),

    // ============================================
    // CONFIRM PASSWORD VALIDATION
    // ============================================
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your new password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// ============================================
// 7. CHANGE PASSWORD VALIDATION
// ============================================
const changePasswordSchema = [
    // ============================================
    // CURRENT PASSWORD VALIDATION
    // ============================================
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    // ============================================
    // NEW PASSWORD VALIDATION
    // ============================================
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8, max: 50 })
        .withMessage('Password must be between 8 and 50 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain at least one special character'),

    // ============================================
    // CONFIRM PASSWORD VALIDATION
    // ============================================
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your new password')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// ============================================
// 8. REFRESH TOKEN VALIDATION
// ============================================
const refreshTokenSchema = [
    body('refreshToken')
        .notEmpty().withMessage('Refresh token is required')
];

// ============================================
// 9. 2FA VALIDATION
// ============================================
const verify2FASchema = [
    body('code')
        .notEmpty().withMessage('2FA code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('2FA code must be exactly 6 digits')
        .isNumeric()
        .withMessage('2FA code must contain only numbers')
];

const setup2FASchema = [
    body('code')
        .notEmpty().withMessage('2FA code is required')
        .isLength({ min: 6, max: 6 })
        .withMessage('2FA code must be exactly 6 digits')
        .isNumeric()
        .withMessage('2FA code must contain only numbers')
];

// ============================================
// EXPORT ALL SCHEMAS
// ============================================
module.exports = {
    // Registration
    registerSchema,

    // Login
    loginSchema,

    // Email Verification
    verifyEmailSchema,

    // Resend OTP
    resendOTPSchema,

    // Forgot Password
    forgotPasswordSchema,

    // Reset Password
    resetPasswordSchema,

    // Change Password
    changePasswordSchema,

    // Refresh Token
    refreshTokenSchema,

    // 2FA
    verify2FASchema,
    setup2FASchema
};
// modules/auth/auth.validation.js
const { body } = require('express-validator');

// ============================================
// REGISTRATION VALIDATION
// ============================================
const registerSchema = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail({ gmail_remove_dots: false })
        .isLength({ max: 100 }).withMessage('Email must be less than 100 characters'),

    body('mobile')
        .trim()
        .notEmpty().withMessage('Mobile number is required')
        .isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number')
        .isLength({ min: 10, max: 10 }).withMessage('Mobile number must be 10 digits')
        .matches(/^[0-9]{10}$/).withMessage('Mobile number must contain only digits'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .isLength({ max: 50 }).withMessage('Password must be less than 50 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character')
        .not().matches(/\s/).withMessage('Password cannot contain spaces'),

    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// ============================================
// EMAIL VERIFICATION VALIDATION
// ============================================
const verifyEmailSchema = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers')
];

// ============================================
// RESEND OTP VALIDATION
// ============================================
const resendOTPSchema = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
];

// ============================================
// LOGIN VALIDATION
// ============================================
const loginSchema = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
];

// ============================================
// FORGOT PASSWORD VALIDATION
// ============================================
const forgotPasswordSchema = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail()
];

// ============================================
// RESET PASSWORD VALIDATION
// ============================================
const resetPasswordSchema = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),

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
// CHANGE PASSWORD VALIDATION
// ============================================
const changePasswordSchema = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),

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
// REFRESH TOKEN VALIDATION
// ============================================
const refreshTokenSchema = [
    body('refreshToken')
        .notEmpty().withMessage('Refresh token is required')
];

// ============================================
// 2FA VALIDATION
// ============================================
const verify2FASchema = [
    body('code')
        .notEmpty().withMessage('2FA code is required')
        .isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
        .isNumeric().withMessage('2FA code must contain only numbers')
];

const setup2FASchema = [
    body('code')
        .notEmpty().withMessage('2FA code is required')
        .isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
        .isNumeric().withMessage('2FA code must contain only numbers')
];

module.exports = {
    registerSchema,
    verifyEmailSchema,
    resendOTPSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    refreshTokenSchema,
    verify2FASchema,
    setup2FASchema
};
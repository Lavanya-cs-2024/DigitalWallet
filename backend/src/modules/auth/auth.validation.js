// ============================================
// AUTH VALIDATION - Complete File
// ============================================
// Purpose: Define validation rules for all auth endpoints
// Uses: express-validator library
// Called by: validation.middleware.js
// ============================================

const { body } = require('express-validator');

// ============================================
// 1. REGISTRATION VALIDATION
// ============================================
// Validates the /api/auth/register endpoint
// Fields: name, email, mobile, password, confirmPassword
// ============================================
const registerSchema = [
    // ============================================
    // NAME VALIDATION
    // ============================================
    // Rules:
    //   - Required
    //   - Between 2 and 50 characters
    //   - Only letters and spaces
    // ============================================
    body('name')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Name is required')                    // Must not be empty
        .isLength({ min: 2, max: 50 })                                 // Length check
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)                                      // Regex: letters + spaces
        .withMessage('Name can only contain letters and spaces'),

    // ============================================
    // EMAIL VALIDATION
    // ============================================
    // Rules:
    //   - Required
    //   - Valid email format
    //   - Max 100 characters
    //   - Keep dots (Gmail dot removal is OFF)
    // ============================================
    body('email')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Email is required')                   // Must not be empty
        .isEmail().withMessage('Please provide a valid email address') // Email format
        .isLength({ max: 100 })                                        // Max length
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail({ gmail_remove_dots: false }),                 // ✅ Keep dots!

    // ============================================
    // MOBILE VALIDATION
    // ============================================
    // Rules:
    //   - Required
    //   - Exactly 10 digits
    //   - Only numbers
    // ============================================
    body('mobile')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Mobile number is required')           // Must not be empty
        .isLength({ min: 10, max: 10 })                                // Exactly 10
        .withMessage('Mobile number must be exactly 10 digits')
        .matches(/^[0-9]{10}$/)                                        // Regex: 10 digits
        .withMessage('Mobile number must contain only digits'),

    // ============================================
    // PASSWORD VALIDATION
    // ============================================
    // Rules:
    //   - Required
    //   - 8-50 characters
    //   - At least 1 uppercase (A-Z)
    //   - At least 1 lowercase (a-z)
    //   - At least 1 number (0-9)
    //   - At least 1 special character
    //   - No spaces
    // ============================================
    body('password')
        .notEmpty().withMessage('Password is required')                // Must not be empty
        .isLength({ min: 8, max: 50 })                                 // Length check
        .withMessage('Password must be between 8 and 50 characters')
        .matches(/[A-Z]/)                                              // Uppercase check
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)                                              // Lowercase check
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)                                              // Number check
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)                             // Special char check
        .withMessage('Password must contain at least one special character')
        .not().matches(/\s/)                                           // No spaces
        .withMessage('Password cannot contain spaces'),

    // ============================================
    // CONFIRM PASSWORD VALIDATION
    // ============================================
    // Rules:
    //   - Required
    //   - Must match password field
    // ============================================
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')        // Must not be empty
        .isLength({ max: 50 })                                         // Max length
        .withMessage('Confirm password must be less than 50 characters')
        .custom((value, { req }) => {                                  // Custom comparison
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// ============================================
// 2. LOGIN VALIDATION
// ============================================
// Validates the /api/auth/login endpoint
// Fields: email, password
// ============================================
const loginSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Email is required')                   // Must not be empty
        .isEmail().withMessage('Please provide a valid email')         // Email format
        .isLength({ max: 100 })                                        // Max length
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail({ gmail_remove_dots: false }),                 // ✅ Keep dots!

    // ============================================
    // PASSWORD VALIDATION
    // ============================================
    body('password')
        .notEmpty().withMessage('Password is required')                // Must not be empty
        .isLength({ max: 50 })                                         // Max length
        .withMessage('Password must be less than 50 characters')
];

// ============================================
// 3. EMAIL VERIFICATION VALIDATION
// ============================================
// Validates the /api/auth/verify-email endpoint
// Fields: email, otp
// ============================================
const verifyEmailSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Email is required')                   // Must not be empty
        .isEmail().withMessage('Please provide a valid email')         // Email format
        .isLength({ max: 100 })                                        // Max length
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail({ gmail_remove_dots: false }),                 // ✅ Keep dots!

    // ============================================
    // OTP VALIDATION
    // ============================================
    // Rules:
    //   - Required
    //   - Exactly 6 digits
    //   - Only numbers
    // ============================================
    body('otp')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('OTP is required')                     // Must not be empty
        .isLength({ min: 6, max: 6 })                                  // Exactly 6
        .withMessage('OTP must be exactly 6 digits')
        .isNumeric()                                                   // Only numbers
        .withMessage('OTP must contain only numbers')
];

// ============================================
// 4. RESEND OTP VALIDATION
// ============================================
// Validates the /api/auth/resend-otp endpoint
// Fields: email
// ============================================
const resendOTPSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Email is required')                   // Must not be empty
        .isEmail().withMessage('Please provide a valid email')         // Email format
        .isLength({ max: 100 })                                        // Max length
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail({ gmail_remove_dots: false })                  // ✅ Keep dots!
];

// ============================================
// 5. FORGOT PASSWORD VALIDATION
// ============================================
// Validates the /api/auth/forgot-password endpoint
// Fields: email
// ============================================
const forgotPasswordSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Email is required')                   // Must not be empty
        .isEmail().withMessage('Please provide a valid email')         // Email format
        .isLength({ max: 100 })                                        // Max length
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail({ gmail_remove_dots: false })                  // ✅ Keep dots!
];

// ============================================
// 6. RESET PASSWORD VALIDATION
// ============================================
// Validates the /api/auth/reset-password endpoint
// Fields: email, otp, newPassword, confirmPassword
// ============================================
const resetPasswordSchema = [
    // ============================================
    // EMAIL VALIDATION
    // ============================================
    body('email')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('Email is required')                   // Must not be empty
        .isEmail().withMessage('Please provide a valid email')         // Email format
        .isLength({ max: 100 })                                        // Max length
        .withMessage('Email must be less than 100 characters')
        .normalizeEmail({ gmail_remove_dots: false }),                 // ✅ Keep dots!

    // ============================================
    // OTP VALIDATION
    // ============================================
    body('otp')
        .trim()                                                        // Remove whitespace
        .notEmpty().withMessage('OTP is required')                     // Must not be empty
        .isLength({ min: 6, max: 6 })                                  // Exactly 6
        .withMessage('OTP must be exactly 6 digits')
        .isNumeric()                                                   // Only numbers
        .withMessage('OTP must contain only numbers'),

    // ============================================
    // NEW PASSWORD VALIDATION
    // ============================================
    body('newPassword')
        .notEmpty().withMessage('New password is required')            // Must not be empty
        .isLength({ min: 8, max: 50 })                                 // Length check
        .withMessage('Password must be between 8 and 50 characters')
        .matches(/[A-Z]/)                                              // Uppercase
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)                                              // Lowercase
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)                                              // Number
        .withMessage('Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)                             // Special char
        .withMessage('Password must contain at least one special character'),

    // ============================================
    // CONFIRM PASSWORD VALIDATION
    // ============================================
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your new password')    // Must not be empty
        .custom((value, { req }) => {                                  // Compare
            if (value !== req.body.newPassword) {
                throw new Error('Passwords do not match');
            }
            return true;
        })
];

// ============================================
// 7. CHANGE PASSWORD VALIDATION
// ============================================
// Validates the /api/auth/change-password endpoint
// Fields: currentPassword, newPassword, confirmPassword
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
// Validates the /api/auth/refresh-token endpoint
// Fields: refreshToken
// ============================================
const refreshTokenSchema = [
    body('refreshToken')
        .notEmpty().withMessage('Refresh token is required')
];

// ============================================
// 9. 2FA VALIDATION
// ============================================
// Validates 2FA endpoints
// Fields: code (6-digit TOTP)
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
// These are imported by auth.routes.js
// Used like: validate(registerSchema), validate(loginSchema), etc.
// ============================================
module.exports = {
    registerSchema,          // Used in POST /api/auth/register
    loginSchema,             // Used in POST /api/auth/login
    verifyEmailSchema,       // Used in POST /api/auth/verify-email
    resendOTPSchema,         // Used in POST /api/auth/resend-otp
    forgotPasswordSchema,    // Used in POST /api/auth/forgot-password
    resetPasswordSchema,     // Used in POST /api/auth/reset-password
    changePasswordSchema,    // Used in POST /api/auth/change-password
    refreshTokenSchema,      // Used in POST /api/auth/refresh-token
    verify2FASchema,         // Used in POST /api/auth/2fa/verify
    setup2FASchema           // Used in POST /api/auth/2fa/verify-setup
};
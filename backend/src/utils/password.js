// utils/password.js
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
    if (!password) {
        throw new Error('Password is required');
    }
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if match
 */
async function comparePassword(password, hash) {
    if (!password || !hash) {
        return false;
    }
    return await bcrypt.compare(password, hash);
}

/**
 * Check if password meets security requirements
 * @param {string} password - Password to check
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
    const errors = [];

    if (!password || password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    if (/\s/.test(password)) {
        errors.push('Password cannot contain spaces');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    hashPassword,
    comparePassword,
    validatePasswordStrength
};
// utils/jwt.js
const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
}

/**
 * Generate access and refresh tokens
 * @param {Object} payload - User data to encode
 * @returns {Object} { accessToken, refreshToken }
 */
function generateTokens(payload) {
    const accessToken = jwt.sign(
        payload, 
        JWT_SECRET, 
        { expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY }
    );
    
    const refreshToken = jwt.sign(
        payload, 
        JWT_SECRET, 
        { expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY }
    );
    
    return { accessToken, refreshToken };
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded payload or null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null
 */
function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateTokens,
    verifyToken,
    decodeToken,
    JWT_SECRET
};
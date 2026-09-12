// jest.setup.js
// This file runs BEFORE all tests to set up the test environment

// ============================================
// 1. LOAD ENVIRONMENT VARIABLES
// ============================================
require('dotenv').config({ path: '.env' });

// ============================================
// 2. SET TEST JWT SECRET (fallback)
// ============================================
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret-for-jest-1234567890';
}

// ============================================
// 3. INCREASE TIMEOUT FOR ASYNC TESTS
// ============================================
jest.setTimeout(30000);

// ============================================
// 4. SILENCE CONSOLE LOGS DURING TESTS
// ============================================
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
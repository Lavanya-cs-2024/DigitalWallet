// Test file for login feature
// Path: tests/unit/auth/login.test.js

// ============================================
// MOCK DEPENDENCIES
// ============================================

// Mock Prisma client
jest.mock('../../../src/config/prisma', () => ({
    // Mock user model methods
    user: {
        // Mock findUnique
        findUnique: jest.fn(),
        // Mock update
        update: jest.fn()
    }
}));

// Mock password utilities
jest.mock('../../../src/utils/password', () => ({
    // Mock comparePassword
    comparePassword: jest.fn()
}));

// Mock JWT utilities
jest.mock('../../../src/utils/jwt', () => ({
    // Mock generateTokens
    generateTokens: jest.fn()
}));

// Mock audit utilities
jest.mock('../../../src/utils/audit', () => ({
    // Mock logSecurityEvent
    logSecurityEvent: jest.fn()
}));

// ============================================
// IMPORTS
// ============================================

// Import mocked Prisma
const prisma = require('../../../src/config/prisma');
// Import mocked comparePassword
const { comparePassword } = require('../../../src/utils/password');
// Import mocked generateTokens
const { generateTokens } = require('../../../src/utils/jwt');
// Import mocked logSecurityEvent
const { logSecurityEvent } = require('../../../src/utils/audit');
// Import auth service to test
const authService = require('../../../src/modules/auth/auth.service');

// ============================================
// TEST DATA
// ============================================

// Valid login credentials
const validCredentials = {
    email: 'test@example.com',
    password: 'Password@123'
};

// Active user with all fields (as returned by Prisma)
const activeUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    mobile: '9876543210',
    passwordHash: 'hashed-password',
    status: 'ACTIVE',
    emailVerified: true,
    loginCount: 0,
    wallet: { id: 1, balance: 0 },
    twoFA: null
};

// Mock tokens returned by generateTokens
const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
};

// ============================================
// TEST SUITE: LOGIN
// ============================================

// Describe block for login tests
describe('Login Feature', () => {

    // Setup before each test
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock: findUnique returns active user
        prisma.user.findUnique.mockResolvedValue(activeUser);

        // Mock: password comparison returns true
        comparePassword.mockResolvedValue(true);

        // Mock: update returns updated user
        prisma.user.update.mockResolvedValue({ ...activeUser, loginCount: 1 });

        // Mock: token generation returns tokens
        generateTokens.mockReturnValue(mockTokens);

        // Mock: audit log returns true
        logSecurityEvent.mockResolvedValue(true);
    });

    // ============================================
    // 1. VALID LOGIN
    // ============================================

    // Test: successful login with correct credentials
    test('should login successfully with valid credentials', async () => {
        // Call login with valid credentials
        const result = await authService.login(validCredentials);
        // Assert: returns access token
        expect(result).toHaveProperty('accessToken', 'mock-access-token');
        // Assert: returns refresh token
        expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
        // Assert: user email matches
        expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    // Test: password is removed from user object
    test('should not return passwordHash in user object', async () => {
        // Call login with valid credentials
        const result = await authService.login(validCredentials);
        // Assert: passwordHash is not present
        expect(result.user).not.toHaveProperty('passwordHash');
    });

    // Test: wallet is returned on successful login
    test('should return wallet data on successful login', async () => {
        // Call login with valid credentials
        const result = await authService.login(validCredentials);
        // Assert: wallet is present
        expect(result).toHaveProperty('wallet');
        // Assert: wallet balance is 0
        expect(result.wallet).toHaveProperty('balance', 0);
    });

    // Test: login count is incremented
    test('should increment login count on successful login', async () => {
        // Call login with valid credentials
        await authService.login(validCredentials);
        // Assert: user.update was called
        expect(prisma.user.update).toHaveBeenCalledWith(
            // Assert: update contains loginCount
            expect.objectContaining({
                data: expect.objectContaining({
                    loginCount: 1
                })
            })
        );
    });

    // Test: tokens are generated
    test('should generate access and refresh tokens', async () => {
        // Call login with valid credentials
        await authService.login(validCredentials);
        // Assert: generateTokens was called with user info
        expect(generateTokens).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 1,
                email: 'test@example.com'
            })
        );
    });

    // Test: security event is logged
    test('should log security event on successful login', async () => {
        // Call login with valid credentials
        await authService.login(validCredentials);
        // Assert: logSecurityEvent was called
        expect(logSecurityEvent).toHaveBeenCalledWith(
            // Assert: event type is LOGIN_SUCCESS
            1,
            'LOGIN_SUCCESS',
            // Assert: description includes email
            expect.stringContaining('test@example.com'),
            // Any IP address
            expect.anything(),
            // Any user agent
            expect.anything()
        );
    });

    // ============================================
    // 2. INVALID CREDENTIALS
    // ============================================

    // Test: non-existent user is rejected
    test('should reject login with non-existent email', async () => {
        // Mock: user not found
        prisma.user.findUnique.mockResolvedValue(null);
        // Expect login to throw error
        await expect(
            authService.login(validCredentials)
        ).rejects.toThrow('Invalid email or password.');
    });

    // Test: wrong password is rejected
    test('should reject login with wrong password', async () => {
        // Mock: password does not match
        comparePassword.mockResolvedValue(false);
        // Expect login to throw error
        await expect(
            authService.login(validCredentials)
        ).rejects.toThrow('Invalid email or password.');
    });

    // ============================================
    // 3. ACCOUNT STATUS CHECKS
    // ============================================

    // Test: PENDING_VERIFICATION user is rejected
    test('should reject login for PENDING_VERIFICATION user', async () => {
        // Mock: user with PENDING_VERIFICATION status
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            status: 'PENDING_VERIFICATION',
            emailVerified: false
        });
        // Expect login to throw PENDING_VERIFICATION error
        await expect(
            authService.login(validCredentials)
        ).rejects.toMatchObject({
            code: 'PENDING_VERIFICATION'
        });
    });

    // Test: suspended user is rejected
    test('should reject login for suspended user', async () => {
        // Mock: user with SUSPENDED status
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            status: 'SUSPENDED'
        });
        // Expect login to throw error
        await expect(
            authService.login(validCredentials)
        ).rejects.toThrow('Account is not active. Please contact support.');
    });

    // ============================================
    // 4. SECURITY ORDER CHECKS
    // ============================================

    // Test: password verified BEFORE status check
    test('should reject unverified user with wrong password as invalid credentials', async () => {
        // Mock: user with PENDING status
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            status: 'PENDING_VERIFICATION'
        });
        // Mock: wrong password
        comparePassword.mockResolvedValue(false);
        // Expect: returns INVALID_CREDENTIALS (not PENDING_VERIFICATION)
        await expect(
            authService.login(validCredentials)
        ).rejects.toThrow('Invalid email or password.');
    });

    // ============================================
    // 5. 2FA CHECKS
    // ============================================

    // Test: 2FA enabled returns require2FA flag
    test('should return require2FA when 2FA is enabled', async () => {
        // Mock: user with 2FA enabled
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            twoFA: { isEnabled: true, secret: 'mock-secret' }
        });
        // Call login
        const result = await authService.login(validCredentials);
        // Assert: require2FA is true
        expect(result.require2FA).toBe(true);
        // Assert: tempToken is returned
        expect(result).toHaveProperty('tempToken');
    });

    // Test: 2FA disabled returns require2FA false
    test('should not require 2FA when 2FA is disabled', async () => {
        // Mock: user without 2FA
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            twoFA: null
        });
        // Call login
        const result = await authService.login(validCredentials);
        // Assert: require2FA is false
        expect(result.require2FA).toBe(false);
    });

    // ============================================
    // 6. FIRST LOGIN PROMPT
    // ============================================

    // Test: first login shows 2FA prompt
    test('should show 2FA prompt on first login', async () => {
        // Mock: user with loginCount 0
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            loginCount: 0
        });
        // Call login
        const result = await authService.login(validCredentials);
        // Assert: show2FAPrompt is true
        expect(result.show2FAPrompt).toBe(true);
        // Assert: isFirstLogin is true
        expect(result.isFirstLogin).toBe(true);
    });

    // Test: 2FA prompt shows within first 3 logins
    test('should show 2FA prompt on 2nd and 3rd logins', async () => {
        // Mock: user with loginCount 2
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            loginCount: 2
        });
        // Call login
        const result = await authService.login(validCredentials);
        // Assert: show2FAPrompt is true
        expect(result.show2FAPrompt).toBe(true);
    });

    // Test: no 2FA prompt after 3 logins
    test('should NOT show 2FA prompt after 3 logins', async () => {
        // Mock: user with loginCount 4
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            loginCount: 4
        });
        // Call login
        const result = await authService.login(validCredentials);
        // Assert: show2FAPrompt is false
        expect(result.show2FAPrompt).toBe(false);
    });
});
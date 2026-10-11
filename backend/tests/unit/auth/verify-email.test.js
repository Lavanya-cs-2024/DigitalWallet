// Test file for email verification feature
// Path: tests/unit/auth/verify-email.test.js

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
    },
    // Mock OTP model methods
    oTP: {
        // Mock update
        update: jest.fn(),
        // Mock updateMany
        updateMany: jest.fn(),
        // Mock count
        count: jest.fn()
    },
    // Mock wallet model methods
    wallet: {
        // Mock create
        create: jest.fn()
    },
    // Mock transaction
    $transaction: jest.fn()
}));

// Mock email utilities
jest.mock('../../../src/utils/email', () => ({
    // Mock sendEmail
    sendEmail: jest.fn(),
    // Mock getWelcomeTemplate
    getWelcomeTemplate: jest.fn()
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
// Import mocked sendEmail
const { sendEmail } = require('../../../src/utils/email');
// Import mocked logSecurityEvent
const { logSecurityEvent } = require('../../../src/utils/audit');
// Import auth service to test
const authService = require('../../../src/modules/auth/auth.service');

// ============================================
// TEST DATA
// ============================================

// Valid verification request
const validVerification = {
    email: 'test@example.com',
    otp: '123456'
};

// User pending verification
const pendingUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    status: 'PENDING_VERIFICATION',
    emailVerified: false,
    // OTP record inside user
    otps: [
        {
            id: 1,
            code: '123456',
            type: 'EMAIL_VERIFICATION',
            expiresAt: new Date(Date.now() + 60000), // 1 min future
            used: false,
            attempts: 0
        }
    ]
};

// ============================================
// TEST SUITE: EMAIL VERIFICATION
// ============================================

// Describe block for email verification tests
describe('Email Verification Feature', () => {

    // Setup before each test
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock: user found with pending status
        prisma.user.findUnique.mockResolvedValue(pendingUser);

        // Mock: OTP count returns 0 (no rate limit)
        prisma.oTP.count.mockResolvedValue(0);

        // Mock: transaction executes callback
        prisma.$transaction.mockImplementation((promises) => Promise.all(promises));

        // Mock: OTP update returns updated record
        prisma.oTP.update.mockResolvedValue({ id: 1, used: true });

        // Mock: user update returns activated user
        prisma.user.update.mockResolvedValue({
            id: 1,
            email: 'test@example.com',
            status: 'ACTIVE',
            emailVerified: true
        });

        // Mock: wallet create returns wallet
        prisma.wallet.create.mockResolvedValue({ id: 1, userId: 1, balance: 0 });

        // Mock: email sending returns true
        sendEmail.mockResolvedValue(true);

        // Mock: audit log returns true
        logSecurityEvent.mockResolvedValue(true);
    });

    // ============================================
    // 1. VALID OTP VERIFICATION
    // ============================================

    // Test: valid OTP activates the account
    test('should verify email with valid OTP', async () => {
        // Call verifyEmail with valid data
        const result = await authService.verifyEmail(validVerification);
        // Assert: status is ACTIVE
        expect(result.status).toBe('ACTIVE');
        // Assert: emailVerified is true
        expect(result.emailVerified).toBe(true);
    });

    // Test: user status updated to ACTIVE
    test('should update user status to ACTIVE', async () => {
        // Call verifyEmail with valid data
        await authService.verifyEmail(validVerification);
        // Assert: user.update was called with correct status
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'ACTIVE',
                    emailVerified: true
                })
            })
        );
    });

    // Test: OTP is marked as used
    test('should mark OTP as used after verification', async () => {
        // Call verifyEmail with valid data
        await authService.verifyEmail(validVerification);
        // Assert: OTP update was called with used: true
        expect(prisma.oTP.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    used: true
                })
            })
        );
    });

    // Test: wallet is created for new user
    test('should create wallet for verified user', async () => {
        // Call verifyEmail with valid data
        await authService.verifyEmail(validVerification);
        // Assert: wallet.create was called
        expect(prisma.wallet.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 1,
                    balance: 0
                })
            })
        );
    });

    // Test: welcome email is sent
    test('should send welcome email after verification', async () => {
        // Call verifyEmail with valid data
        await authService.verifyEmail(validVerification);
        // Assert: email was sent
        expect(sendEmail).toHaveBeenCalled();
    });

    // Test: security event is logged
    test('should log security event on verification', async () => {
        // Call verifyEmail with valid data
        await authService.verifyEmail(validVerification);
        // Assert: logSecurityEvent was called
        expect(logSecurityEvent).toHaveBeenCalledWith(
            // Assert: user ID
            1,
            // Assert: event type
            'EMAIL_VERIFIED',
            // Assert: description includes email
            expect.stringContaining('test@example.com'),
            // Any IP
            expect.anything(),
            // Any user agent
            expect.anything()
        );
    });

    // ============================================
    // 2. USER NOT FOUND
    // ============================================

    // Test: non-existent user is rejected
    test('should reject verification for non-existent user', async () => {
        // Mock: user not found
        prisma.user.findUnique.mockResolvedValue(null);
        // Expect verifyEmail to throw
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toThrow('User not found.');
    });

    // ============================================
    // 3. ALREADY VERIFIED
    // ============================================

    // Test: already verified user is rejected
    test('should reject verification for already verified user', async () => {
        // Mock: user already ACTIVE
        prisma.user.findUnique.mockResolvedValue({
            ...pendingUser,
            status: 'ACTIVE',
            emailVerified: true
        });
        // Expect verifyEmail to throw
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toThrow('Email already verified. Please login.');
    });

    // ============================================
    // 4. NO ACTIVE OTP
    // ============================================

    // Test: no active OTP is rejected
    test('should reject when no active OTP exists', async () => {
        // Mock: user with empty OTP array
        prisma.user.findUnique.mockResolvedValue({
            ...pendingUser,
            otps: []
        });
        // Expect verifyEmail to throw
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toThrow('No active OTP found. Please request a new OTP.');
    });

    // ============================================
    // 5. EXPIRED OTP
    // ============================================

    // Test: expired OTP is rejected
    test('should reject expired OTP', async () => {
        // Mock: user with expired OTP
        prisma.user.findUnique.mockResolvedValue({
            ...pendingUser,
            otps: [{
                id: 1,
                code: '123456',
                expiresAt: new Date(Date.now() - 60000), // Past
                used: false,
                attempts: 0
            }]
        });
        // Expect verifyEmail to throw OTP expired error
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toThrow('OTP has expired. Please request a new one.');
    });

    // Test: expired OTP returns correct error code
    test('should return OTP_EXPIRED code for expired OTP', async () => {
        // Mock: user with expired OTP
        prisma.user.findUnique.mockResolvedValue({
            ...pendingUser,
            otps: [{
                id: 1,
                code: '123456',
                expiresAt: new Date(Date.now() - 60000),
                used: false,
                attempts: 0
            }]
        });
        // Expect error code to be OTP_EXPIRED
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toMatchObject({
            code: 'OTP_EXPIRED'
        });
    });

    // ============================================
    // 6. INVALID OTP
    // ============================================

    // Test: wrong OTP is rejected
    test('should reject wrong OTP', async () => {
        // Call with wrong OTP
        const result = authService.verifyEmail({
            email: 'test@example.com',
            otp: '000000'
        });
        // Expect rejection with Invalid OTP message
        await expect(result).rejects.toThrow(/Invalid OTP/);
    });

    // Test: attempt counter is incremented on wrong OTP
    test('should increment attempts on wrong OTP', async () => {
        // Call with wrong OTP
        try {
            await authService.verifyEmail({
                email: 'test@example.com',
                otp: '000000'
            });
        } catch (error) {
            // Ignore error
        }
        // Assert: OTP update called with increment
        expect(prisma.oTP.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    attempts: { increment: 1 }
                })
            })
        );
    });

    // Test: shows remaining attempts on wrong OTP
    test('should show remaining attempts on wrong OTP', async () => {
        // Call with wrong OTP
        await expect(
            authService.verifyEmail({
                email: 'test@example.com',
                otp: '000000'
            })
        ).rejects.toThrow(/remaining/);
    });

    // ============================================
    // 7. MAX ATTEMPTS
    // ============================================

    // Test: max attempts reached throws error
    test('should reject after max attempts reached', async () => {
        // Mock: OTP count returns max (5)
        prisma.oTP.count.mockResolvedValue(5);
        // Expect rate limit error
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toThrow(/Too many verification attempts/);
    });

    // ============================================
    // 8. RATE LIMITING
    // ============================================

    // Test: too many attempts in 1 minute is blocked
    test('should reject when too many attempts in 1 minute', async () => {
        // Mock: OTP count exceeds limit
        prisma.oTP.count.mockResolvedValue(6);
        // Expect rate limit error
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toThrow(/Too many verification attempts/);
    });

    // ============================================
    // 9. USED OTP
    // ============================================

    // Test: used OTP is rejected
    test('should reject already used OTP', async () => {
        // Mock: user with used OTP (not returned by query, so empty)
        prisma.user.findUnique.mockResolvedValue({
            ...pendingUser,
            otps: []
        });
        // Expect error
        await expect(
            authService.verifyEmail(validVerification)
        ).rejects.toThrow();
    });
});
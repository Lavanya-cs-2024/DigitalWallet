// Test file for registration feature
// Path: tests/unit/auth/registration.test.js

// ============================================
// MOCK DEPENDENCIES
// ============================================

// Mock Prisma client
jest.mock('../../../src/config/prisma', () => ({
    // Mock user model methods
    user: {
        // Mock findUnique
        findUnique: jest.fn(),
        // Mock create
        create: jest.fn()
    },
    // Mock OTP model methods
    oTP: {
        // Mock updateMany
        updateMany: jest.fn(),
        // Mock create
        create: jest.fn()
    }
}));

// Mock password utilities
jest.mock('../../../src/utils/password', () => ({
    // Mock hashPassword
    hashPassword: jest.fn()
}));

// Mock email utilities
jest.mock('../../../src/utils/email', () => ({
    // Mock sendEmail
    sendEmail: jest.fn(),
    // Mock getOTPEmailTemplate
    getOTPEmailTemplate: jest.fn()
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
// Import mocked hashPassword
const { hashPassword } = require('../../../src/utils/password');
// Import mocked sendEmail
const { sendEmail } = require('../../../src/utils/email');
// Import mocked logSecurityEvent
const { logSecurityEvent } = require('../../../src/utils/audit');
// Import auth service to test
const authService = require('../../../src/modules/auth/auth.service');

// ============================================
// TEST DATA
// ============================================

// Valid user data for testing
const validUser = {
    name: 'Test User',
    email: 'test@example.com',
    mobile: '9876543210',
    password: 'Password@123'
};

// Mock created user returned by Prisma
const createdUser = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    mobile: '9876543210',
    passwordHash: 'hashed-password',
    status: 'PENDING_VERIFICATION',
    emailVerified: false
};

// ============================================
// TEST SUITE: REGISTRATION
// ============================================

// Describe block for registration tests
describe('Registration Feature', () => {

    // Setup before each test
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock: no existing email then no existing mobile
        prisma.user.findUnique
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);

        // Mock: hashPassword returns hashed value
        hashPassword.mockResolvedValue('hashed-password');

        // Mock: user.create returns created user
        prisma.user.create.mockResolvedValue(createdUser);

        // Mock: updateMany returns count 0
        prisma.oTP.updateMany.mockResolvedValue({ count: 0 });
        // Mock: OTP create returns record
        prisma.oTP.create.mockResolvedValue({
            id: 1,
            userId: 1,
            code: '123456',
            type: 'EMAIL_VERIFICATION',
            used: false
        });

        // Mock: email sending returns true
        sendEmail.mockResolvedValue(true);

        // Mock: audit log returns true
        logSecurityEvent.mockResolvedValue(true);
    });

    // ============================================
    // 1. VALID REGISTRATION
    // ============================================

    // Test: valid full name is accepted
    test('should accept a valid full name', async () => {
        // Call register with valid user
        const result = await authService.register(validUser);
        // Assert: name matches
        expect(result.name).toBe('Test User');
    });

    // Test: valid email is accepted
    test('should accept a valid email', async () => {
        // Call register with valid user
        const result = await authService.register(validUser);
        // Assert: email matches
        expect(result.email).toBe('test@example.com');
    });

    // Test: valid mobile is accepted
    test('should accept a valid mobile number', async () => {
        // Call register with valid user
        await authService.register(validUser);
        // Assert: mobile is passed to user.create
        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    mobile: '9876543210'
                })
            })
        );
    });

    // Test: password is hashed before saving
    test('should hash the password before creating the user', async () => {
        // Call register with valid user
        await authService.register(validUser);
        // Assert: hashPassword called with plain password
        expect(hashPassword).toHaveBeenCalledWith('Password@123');
        // Assert: user.create called with hashed password
        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    passwordHash: 'hashed-password'
                })
            })
        );
    });

    // Test: full registration succeeds
    test('should successfully register a valid user', async () => {
        // Call register with valid user
        const result = await authService.register(validUser);
        // Assert: result matches expected structure
        expect(result).toEqual(
            expect.objectContaining({
                userId: 1,
                email: 'test@example.com',
                name: 'Test User',
                status: 'PENDING_VERIFICATION'
            })
        );
    });

    // ============================================
    // 2. NAME VALIDATION
    // ============================================

    // Test: name shorter than 2 chars is rejected
    test('should reject name shorter than 2 characters', async () => {
        // Create user with 1-char name
        const user = { ...validUser, name: 'J' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: name longer than 50 chars is rejected
    test('should reject name longer than 50 characters', async () => {
        // Create user with 51-char name
        const user = { ...validUser, name: 'A'.repeat(51) };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: name with numbers is rejected
    test('should reject name with numbers', async () => {
        // Create user with numeric name
        const user = { ...validUser, name: 'John123' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: name with special chars is rejected
    test('should reject name with special characters', async () => {
        // Create user with special char name
        const user = { ...validUser, name: 'John@Doe' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // ============================================
    // 3. EMAIL VALIDATION
    // ============================================

    // Test: invalid email format is rejected
    test('should reject invalid email format', async () => {
        // Create user with invalid email
        const user = { ...validUser, email: 'invalid-email' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: email >100 chars is rejected
    test('should reject email longer than 100 characters', async () => {
        // Create user with 101+ char email
        const user = { ...validUser, email: 'a'.repeat(101) + '@example.com' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // ============================================
    // 4. MOBILE VALIDATION
    // ============================================

    // Test: mobile with 9 digits is rejected
    test('should reject mobile with 9 digits', async () => {
        // Create user with 9-digit mobile
        const user = { ...validUser, mobile: '987654321' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: mobile with 11 digits is rejected
    test('should reject mobile with 11 digits', async () => {
        // Create user with 11-digit mobile
        const user = { ...validUser, mobile: '98765432101' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: mobile with letters is rejected
    test('should reject mobile with letters', async () => {
        // Create user with letters in mobile
        const user = { ...validUser, mobile: '98765abc10' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // ============================================
    // 5. PASSWORD VALIDATION
    // ============================================

    // Test: password shorter than 8 chars is rejected
    test('should reject password shorter than 8 characters', async () => {
        // Create user with 6-char password
        const user = { ...validUser, password: 'Pass@1' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: password without uppercase is rejected
    test('should reject password without uppercase', async () => {
        // Create user with lowercase-only password
        const user = { ...validUser, password: 'password@123' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: password without lowercase is rejected
    test('should reject password without lowercase', async () => {
        // Create user with uppercase-only password
        const user = { ...validUser, password: 'PASSWORD@123' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: password without number is rejected
    test('should reject password without number', async () => {
        // Create user with no number password
        const user = { ...validUser, password: 'Password@abc' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: password without special char is rejected
    test('should reject password without special character', async () => {
        // Create user with no special char password
        const user = { ...validUser, password: 'Password123' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // Test: password with spaces is rejected
    test('should reject password with spaces', async () => {
        // Create user with space in password
        const user = { ...validUser, password: 'Password@ 123' };
        // Expect register to throw
        try {
            await authService.register(user);
            expect(true).toBe(false);
        } catch (error) {
            expect(error.message).toBeDefined();
        }
    });

    // ============================================
    // 6. DUPLICATE CHECKS
    // ============================================

    // Test: duplicate email is rejected
    test('should reject registration when email already exists', async () => {
        // Mock existing user with same email
        prisma.user.findUnique
            .mockReset()
            .mockResolvedValueOnce({
                id: 10,
                email: 'test@example.com'
            });

        // Expect register to throw EMAIL_EXISTS
        await expect(
            authService.register(validUser)
        ).rejects.toMatchObject({
            code: 'EMAIL_EXISTS'
        });

        // Assert: user not created
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // Test: duplicate mobile is rejected
    test('should reject registration when mobile already exists', async () => {
        // Mock no email, but existing mobile
        prisma.user.findUnique
            .mockReset()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
                id: 20,
                mobile: '9876543210'
            });

        // Expect register to throw MOBILE_EXISTS
        await expect(
            authService.register(validUser)
        ).rejects.toMatchObject({
            code: 'MOBILE_EXISTS'
        });

        // Assert: user not created
        expect(prisma.user.create).not.toHaveBeenCalled();
    });

    // ============================================
    // 7. ACCOUNT STATUS & OTP
    // ============================================

    // Test: account created as PENDING_VERIFICATION
    test('should create the account as pending verification', async () => {
        // Call register
        const result = await authService.register(validUser);
        // Assert: status is PENDING
        expect(result.status).toBe('PENDING_VERIFICATION');
        // Assert: user.create called with correct status
        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    status: 'PENDING_VERIFICATION',
                    emailVerified: false
                })
            })
        );
    });

    // Test: email verification OTP is created
    test('should create an email verification OTP', async () => {
        // Call register
        await authService.register(validUser);
        // Assert: OTP created with correct data
        expect(prisma.oTP.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 1,
                    type: 'EMAIL_VERIFICATION',
                    used: false,
                    attempts: 0,
                    resendCount: 0
                })
            })
        );
    });

    // Test: verification OTP email is sent
    test('should send verification OTP email', async () => {
        // Call register
        await authService.register(validUser);
        // Assert: email sent with correct details
        expect(sendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'test@example.com',
                subject: 'Verify Your Email - Digital Wallet'
            })
        );
    });
});
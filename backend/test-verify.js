// test-verify.js
// Run this with: node test-verify.js

require('dotenv').config();
const prisma = require('./src/config/prisma');
const authService = require('./src/modules/auth/auth.service');

async function testVerifyEmail() {
    console.log('\n════════════════════════════════════════');
    console.log('🧪 VERIFY EMAIL — DIAGNOSTIC TEST');
    console.log('════════════════════════════════════════\n');

    // ============================================
    // STEP 1: List all users in DB
    // ============================================
    console.log('📋 STEP 1: All users in database');
    console.log('─────────────────────────────────────');
    const allUsers = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            status: true,
            emailVerified: true
        }
    });

    if (allUsers.length === 0) {
        console.log('❌ No users found in database!');
        console.log('   Please register a user first.\n');
        await prisma.$disconnect();
        return;
    }

    allUsers.forEach(u => {
        console.log(`\n   [${u.id}] ${u.name}`);
        console.log(`       Email: "${u.email}"`);
        console.log(`       Length: ${u.email.length}`);
        console.log(`       Char codes: ${u.email.split('').map(c => c.charCodeAt(0)).join(',')}`);
        console.log(`       Status: ${u.status}`);
        console.log(`       Email Verified: ${u.emailVerified}`);
    });

    // ============================================
    // STEP 2: Test each user's email lookup
    // ============================================
    console.log('\n\n📋 STEP 2: Test email lookup for each user');
    console.log('─────────────────────────────────────');

    for (const u of allUsers) {
        console.log(`\n   Testing: "${u.email}"`);

        // Test A: Exact match (findUnique)
        const foundUnique = await prisma.user.findUnique({
            where: { email: u.email }
        });
        console.log(`   🔍 findUnique: ${foundUnique ? '✅ FOUND' : '❌ NOT FOUND'}`);

        // Test B: findFirst
        const foundFirst = await prisma.user.findFirst({
            where: { email: u.email }
        });
        console.log(`   🔍 findFirst:  ${foundFirst ? '✅ FOUND' : '❌ NOT FOUND'}`);

        // Test C: Raw query
        try {
            const rawResult = await prisma.$queryRaw`
                SELECT id, email, status FROM User WHERE email = ${u.email}
            `;
            console.log(`   🔍 Raw query:  ${rawResult.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
        } catch (error) {
            console.log(`   🔍 Raw query:  ❌ ERROR: ${error.message}`);
        }

        // Test D: Case-insensitive
        const foundInsensitive = await prisma.user.findFirst({
            where: {
                email: {
                    equals: u.email.toLowerCase()
                }
            }
        });
        console.log(`   🔍 Lowercase:  ${foundInsensitive ? '✅ FOUND' : '❌ NOT FOUND'}`);
    }

    // ============================================
    // STEP 3: Test with SPECIFIC email
    // ============================================
    console.log('\n\n📋 STEP 3: Test with user input');
    console.log('─────────────────────────────────────');

    // Change this to the email you're testing
    const testEmail = process.argv[2] || allUsers[0].email;

    console.log(`\n   Testing email: "${testEmail}"`);
    console.log(`   Length: ${testEmail.length}`);
    console.log(`   Char codes: ${testEmail.split('').map(c => c.charCodeAt(0)).join(',')}`);

    // Test variations
    const variations = [
        { label: 'Original', value: testEmail },
        { label: 'Lowercase', value: testEmail.toLowerCase() },
        { label: 'Trimmed', value: testEmail.trim() },
        { label: 'Lower+Trim', value: testEmail.toLowerCase().trim() },
        { label: 'Uppercase', value: testEmail.toUpperCase() }
    ];

    for (const v of variations) {
        const found = await prisma.user.findFirst({
            where: { email: v.value }
        });
        console.log(`   [${v.label.padEnd(12)}] "${v.value}" → ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
    }

    // ============================================
    // STEP 4: Test via authService.verifyEmail
    // ============================================
    console.log('\n\n📋 STEP 4: Test via authService.verifyEmail()');
    console.log('─────────────────────────────────────');

    const testUser = allUsers.find(u => u.status === 'PENDING_VERIFICATION');

    if (!testUser) {
        console.log('⚠️  No user with PENDING_VERIFICATION status');
        console.log('   Register a new user to test this.\n');
    } else {
        console.log(`\n   Test user: [${testUser.id}] "${testUser.email}"`);

        // Get the OTP for this user
        const otpRecord = await prisma.oTP.findFirst({
            where: {
                userId: testUser.id,
                type: 'EMAIL_VERIFICATION',
                used: false
            },
            orderBy: { createdAt: 'desc' }
        });

        if (!otpRecord) {
            console.log('   ⚠️  No active OTP for this user');
        } else {
            console.log(`   OTP Code: ${otpRecord.code}`);
            console.log(`   Expires: ${otpRecord.expiresAt}`);
            console.log(`   Expired: ${otpRecord.expiresAt < new Date() ? 'YES ❌' : 'NO ✅'}`);

            // Try to verify
            try {
                console.log(`\n   🔍 Calling authService.verifyEmail()...`);
                const result = await authService.verifyEmail({
                    email: testUser.email,
                    otp: otpRecord.code
                });
                console.log('   ✅ SUCCESS!');
                console.log('   Result:', JSON.stringify(result, null, 2));
            } catch (error) {
                console.log(`   ❌ FAILED: ${error.message}`);
                console.log(`   Code: ${error.code || 'undefined'}`);
            }
        }
    }

    // ============================================
    // STEP 5: Check validation middleware behavior
    // ============================================
    console.log('\n\n📋 STEP 5: Test express-validator normalizeEmail');
    console.log('─────────────────────────────────────');

    const { body, validationResult } = require('express-validator');

    const testValues = [
        'lavanya.cs2024@gmail.com',
        'lavanyacs2024@gmail.com',
        'test.user@gmail.com',
        'testuser@gmail.com'
    ];

    for (const val of testValues) {
        // Simulate the validator
        const req = { body: { email: val } };
        const res = {
            status: () => res,
            json: () => res
        };

        // Test both variants
        const defaultSchema = [body('email').normalizeEmail()];
        const fixedSchema = [body('email').normalizeEmail({ gmail_remove_dots: false })];

        // Run default
        for (const v of defaultSchema) {
            await v.run(req);
        }
        const defaultResult = req.body.email;

        // Reset and run fixed
        req.body.email = val;
        for (const v of fixedSchema) {
            await v.run(req);
        }
        const fixedResult = req.body.email;

        console.log(`\n   Input: "${val}"`);
        console.log(`   Default .normalizeEmail() → "${defaultResult}"  ${defaultResult !== val ? '⚠️  CHANGED!' : ''}`);
        console.log(`   Fixed .normalizeEmail({gmail_remove_dots:false}) → "${fixedResult}"  ${fixedResult === val ? '✅' : '⚠️'}`);
    }

    // ============================================
    // DONE
    // ============================================
    console.log('\n════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('════════════════════════════════════════\n');

    await prisma.$disconnect();
}

// Run the test
testVerifyEmail().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
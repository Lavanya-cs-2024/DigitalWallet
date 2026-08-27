// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('=================================');
    console.log('📧 Testing Email Configuration');
    console.log('=================================');
    
    // 1. Check if environment variables exist
    console.log('\n📋 Checking .env configuration...');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');
    console.log('SMTP_FROM:', process.env.SMTP_FROM);
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('\n❌ SMTP_USER or SMTP_PASS is missing in .env file');
        console.log('Please check your .env file and try again.');
        return;
    }

    // 2. Create transporter
    console.log('\n🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465', // true for port 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false // For testing only
        }
    });

    // 3. Verify connection
    console.log('\n🔗 Verifying connection to SMTP server...');
    try {
        await transporter.verify();
        console.log('✅ Connection verified successfully!');
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\n🔍 Troubleshooting tips:');
        console.log('  1. Check if SMTP_HOST is correct (smtp.gmail.com)');
        console.log('  2. Check if SMTP_PORT is correct (587 or 465)');
        console.log('  3. Make sure 2-Step Verification is enabled');
        console.log('  4. Make sure you\'re using App Password (not regular password)');
        console.log('  5. Check your internet connection');
        return;
    }

    // 4. Send test email
    console.log('\n📤 Sending test email...');
    try {
        const info = await transporter.sendMail({
            from: `"Digital Wallet" <${process.env.SMTP_FROM}>`,
            to: process.env.SMTP_USER, // Send to yourself
            subject: '✅ Email Configuration Test - Digital Wallet',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #4f46e5; border-radius: 8px;">
                    <h1 style="color: #4f46e5;">✅ Email is Working!</h1>
                    <p>Your Digital Wallet email configuration is set up correctly.</p>
                    <p>You can now send OTP emails to your users.</p>
                    <div style="background: #f0f2f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="margin: 0; font-size: 14px; color: #666;">
                            <strong>Test Details:</strong><br>
                            Time: ${new Date().toLocaleString()}<br>
                            From: ${process.env.SMTP_FROM}<br>
                            To: ${process.env.SMTP_USER}
                        </p>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 12px;">This is an automated test message from your Digital Wallet application.</p>
                </div>
            `
        });

        console.log('✅ Email sent successfully!');
        console.log('📨 Message ID:', info.messageId);
        console.log('📧 Sent to:', info.accepted.join(', '));
        console.log('📧 From:', process.env.SMTP_FROM);
        
        console.log('\n✅ Test completed successfully!');
        console.log('📧 Check your email inbox (including spam folder).');
        
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        console.log('\n🔍 Troubleshooting tips:');
        console.log('  1. Check if App Password is correct (not your regular password)');
        console.log('  2. Check if SMTP_USER is correct');
        console.log('  3. Make sure 2-Step Verification is enabled');
        console.log('  4. Try generating a new App Password');
        console.log('  5. Check if you have enough email quota');
    }
}

// Run the test
testEmail();
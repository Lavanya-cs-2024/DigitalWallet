// utils/email.js
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email transporter error:', error.message);
    } else {
        console.log('✅ Email transporter ready');
    }
});

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise<Object>} - Email sending result
 */
async function sendEmail({ to, subject, html, text = null }) {
    try {
        const info = await transporter.sendMail({
            from: `"Digital Wallet" <${process.env.SMTP_FROM || 'noreply@digitalwallet.com'}>`,
            to,
            subject,
            text: text || html.replace(/<[^>]*>/g, ''),
            html
        });

        return {
            success: true,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected
        };
    } catch (error) {
        console.error('❌ Email failed:', error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * OTP Verification Email Template
 */
function getOTPEmailTemplate(otpCode, name = 'User') {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5; margin: 0;">💰 Digital Wallet</h1>
                    <p style="color: #666; margin: 5px 0 0;">Secure Digital Payments</p>
                </div>
                
                <div style="border-top: 2px solid #4f46e5; padding-top: 20px;">
                    <h2 style="color: #1a1a2e;">Verify Your Email Address</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">Thank you for registering with Digital Wallet. Please use the following OTP to verify your email address:</p>
                    
                    <div style="background: #f0f2f5; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 2px dashed #4f46e5;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${otpCode}</span>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">⏰ This OTP is valid for <strong>2 minutes</strong>.</p>
                    <p style="color: #666; font-size: 14px;">🔒 If you didn't request this, please ignore this email.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message from Digital Wallet. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

/**
 * Password Reset Email Template
 */
function getPasswordResetTemplate(otpCode, name = 'User') {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5; margin: 0;">💰 Digital Wallet</h1>
                    <p style="color: #666; margin: 5px 0 0;">Secure Digital Payments</p>
                </div>
                
                <div style="border-top: 2px solid #4f46e5; padding-top: 20px;">
                    <h2 style="color: #1a1a2e;">Reset Your Password</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Please use the following OTP to reset your password:</p>
                    
                    <div style="background: #f0f2f5; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 2px dashed #4f46e5;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${otpCode}</span>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">⏰ This OTP is valid for <strong>2 minutes</strong>.</p>
                    <p style="color: #666; font-size: 14px;">🔒 If you didn't request this, please ignore this email.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message from Digital Wallet. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

module.exports = {
    sendEmail,
    getOTPEmailTemplate,
    getPasswordResetTemplate
};
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    const t = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false }
    });

    try {
        const info = await t.sendMail({
            from: `"BookSaloonz" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'Test OTP - BookSaloonz',
            html: '<h1>Test OTP: 123456</h1><p>This is a test email to verify delivery works.</p>'
        });
        console.log('EMAIL SENT OK! MessageId:', info.messageId);
    } catch (e) {
        console.error('EMAIL SEND FAILED:', e.message);
    }
}

testEmail();

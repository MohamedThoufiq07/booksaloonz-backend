const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS // MUST be a 16-character Google App Password
        },
        tls: {
            rejectUnauthorized: false // Helps avoid local cert issues
        }
    });
};

// Verify transporter on startup
const verifyTransporter = async () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials missing in .env. Booking notifications will not work.');
        return;
    }

    const transporter = createTransporter();
    try {
        await transporter.verify();
        console.log('📧 Email service is READY to send notifications');
    } catch (err) {
        console.error('📧 Email Service Connection Error:', err.message);
        console.error('👉 TIP: For Gmail, you MUST use an "App Password" (16 chars), not your regular password.');
    }
};

// Run verification immediately
verifyTransporter();

/**
 * Send booking confirmation email
 */
const sendBookingConfirmation = async (userEmail, bookingDetails) => {
    if (!process.env.EMAIL_USER) {
        console.log('📧 Email not configured — skipping booking confirmation');
        return;
    }

    const transporter = createTransporter();
    const { userName, salonName, service, date, time, price } = bookingDetails;

    const mailOptions = {
        from: `"BookSaloonz" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '✅ Booking Confirmed — BookSaloonz',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #2dd4bf, #14b8a6); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #0f172a; font-size: 28px;">Booking Confirmed! ✨</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>
                    <p>Your appointment has been successfully booked.</p>
                    <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p style="margin: 8px 0;"><strong>🏪 Salon:</strong> ${salonName}</p>
                        <p style="margin: 8px 0;"><strong>💇 Service:</strong> ${service}</p>
                        <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${date}</p>
                        <p style="margin: 8px 0;"><strong>🕐 Time:</strong> ${time}</p>
                        <p style="margin: 8px 0;"><strong>💰 Price:</strong> ₹${price}</p>
                    </div>
                    <p style="color: #94a3b8; font-size: 14px;">Thank you for choosing BookSaloonz!</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Booking confirmation sent to ${userEmail}`);
    } catch (err) {
        console.error('📧 Email send failed:', err.message);
    }
};

/**
 * Send cancellation email
 */
const sendCancellationEmail = async (userEmail, bookingDetails) => {
    if (!process.env.EMAIL_USER) return;

    const transporter = createTransporter();
    const { userName, salonName, service, date, time } = bookingDetails;

    const mailOptions = {
        from: `"BookSaloonz" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '❌ Booking Cancelled — BookSaloonz',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden;">
                <div style="background: #ef4444; padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 28px;">Booking Cancelled</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Hi <strong>${userName}</strong>,</p>
                    <p>Your booking has been cancelled:</p>
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <p><strong>🏪</strong> ${salonName}</p>
                        <p><strong>💇</strong> ${service}</p>
                        <p><strong>📅</strong> ${date} at ${time}</p>
                    </div>
                    <p style="color: #94a3b8;">If you didn't cancel this, please contact support.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('📧 Cancellation email failed:', err.message);
    }
};

/**
 * Send welcome email after signup
 */
const sendWelcomeEmail = async (userEmail, userName) => {
    if (!process.env.EMAIL_USER) return;

    const transporter = createTransporter();

    const mailOptions = {
        from: `"BookSaloonz" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: '🎉 Welcome to BookSaloonz!',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #2dd4bf, #3a7bd5); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 28px;">Welcome to BookSaloonz! 🎉</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>
                    <p>Your account has been created successfully. You can now:</p>
                    <ul style="padding-left: 20px; line-height: 2;">
                        <li>Browse premium salons near you</li>
                        <li>Book appointments instantly</li>
                        <li>Try our AI Hair Tracker</li>
                        <li>Rate and review salons</li>
                    </ul>
                    <p style="color: #94a3b8; font-size: 14px;">Enjoy your grooming experience!</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('📧 Welcome email failed:', err.message);
    }
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmation = async (userEmail, orderDetails) => {
    if (!process.env.EMAIL_USER) return;

    const transporter = createTransporter();
    const { userName, orderId, totalAmount, deliveryType, items, shippingAddress, salonName } = orderDetails;

    const itemsHtml = items.map(item => `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 10px 0;">
            <span>${item.name} x ${item.quantity}</span>
            <span>₹${item.price * item.quantity}</span>
        </div>
    `).join('');

    const deliveryHtml = deliveryType === 'home' ? `
        <div style="background: rgba(45, 212, 191, 0.1); border: 1px dashed #2dd4bf; border-radius: 12px; padding: 15px; margin-top: 20px;">
            <p style="margin: 0; color: #2dd4bf;"><strong>🚚 Home Delivery</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #94a3b8;">Shipping to: ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.zipCode}</p>
        </div>
    ` : `
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px dashed #3b82f6; border-radius: 12px; padding: 15px; margin-top: 20px;">
            <p style="margin: 0; color: #3b82f6;"><strong>🏪 Salon Pickup</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #94a3b8;">Pickup from: ${salonName || 'Assigned Salon'}</p>
        </div>
    `;

    const mailOptions = {
        from: `"BookSaloonz Direct" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: `🛍️ Order Placed Successfully — #${orderId.toString().slice(-6).toUpperCase()}`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 40px; text-align: center;">
                    <div style="background: #2dd4bf; width: 60px; height: 60px; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <span style="font-size: 30px;">🛍️</span>
                    </div>
                    <h1 style="margin: 0; font-size: 26px; color: #fff;">Order Confirmed!</h1>
                    <p style="color: #94a3b8; margin-top: 10px;">Order ID: #${orderId}</p>
                </div>
                
                <div style="padding: 40px; background: #111827;">
                    <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>
                    <p>Great news! We've received your order and it's being processed by our partner network.</p>
                    
                    <div style="margin: 30px 0;">
                        <h4 style="color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; margin-bottom: 15px;">Order Summary</h4>
                        ${itemsHtml}
                        <div style="display: flex; justify-content: space-between; padding: 20px 0; font-size: 18px; font-weight: bold; color: #2dd4bf;">
                            <span>Total Amount</span>
                            <span>₹${totalAmount}</span>
                        </div>
                    </div>

                    ${deliveryHtml}

                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
                        <p style="color: #64748b; font-size: 13px;">You can track your order status in your dashboard.</p>
                        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?tab=orders" style="display: inline-block; background: #2dd4bf; color: #000; padding: 12px 30px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 15px;">View Order</a>
                    </div>
                </div>
                
                <div style="background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #475569;">
                    &copy; 2026 BookSaloonz. All rights reserved.
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`🛍️ Order confirmation sent to ${userEmail}`);
    } catch (err) {
        console.error('📧 Order email failed:', err.message);
    }
};

module.exports = {
    sendBookingConfirmation,
    sendCancellationEmail,
    sendWelcomeEmail,
    sendOrderConfirmation
};

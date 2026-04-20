const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * @desc    Create Razorpay Order
 * @route   POST /api/payments/create-order
 * @access  Private
 */
exports.createOrder = asyncHandler(async (req, res) => {
    const { amount, currency, type, referenceId } = req.body;

    if (!amount || !type || !referenceId) {
        return res.status(400).json({ success: false, message: 'Amount, type, and referenceId are required' });
    }

    const options = {
        amount: Math.round(amount * 100), // convert to paise
        currency: currency || 'INR',
        receipt: `receipt_${referenceId}_${Date.now()}`,
        notes: {
            type,
            referenceId,
            userId: req.user.id
        }
    };

    try {
        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(500).json({ success: false, message: 'Razorpay order creation failed' });
        }

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Verify Razorpay Payment
 * @route   POST /api/payments/verify
 * @access  Private
 */
exports.verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        type,
        referenceId,
        amount // and amount if passed back
    } = req.body;

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        // Log failure to DB
        await Payment.create({
            user: req.user.id,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amount: amount || 0,
            type,
            referenceId,
            status: 'failed'
        });

        return res.status(400).json({
            success: false,
            message: 'Payment verification failed. Signature mismatch.'
        });
    }

    // 2. Signature is valid -> Handle Business Logic
    try {
        if (type === 'booking') {
            await Booking.findByIdAndUpdate(referenceId, {
                paymentStatus: 'paid',
                paymentId: razorpay_payment_id,
                status: 'confirmed'
            });
        } else if (type === 'product') {
            await Order.findByIdAndUpdate(referenceId, {
                paymentStatus: 'paid',
                razorpayPaymentId: razorpay_payment_id,
                status: 'accepted' // usually 'placed' -> 'accepted' or 'processing'
            });
        }

        // 3. Create Payment Record
        await Payment.create({
            user: req.user.id,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            amount: amount || 0, // Frontend should pass final amount for logging
            type,
            referenceId,
            status: 'success'
        });

        res.json({
            success: true,
            message: 'Payment successful',
            paymentId: razorpay_payment_id
        });
    } catch (dbError) {
        console.error('Database Update Error after Payment:', dbError);
        res.status(500).json({ success: false, message: 'Payment verified but failed to update status.' });
    }
});

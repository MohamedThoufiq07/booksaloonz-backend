const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
    const { amount, bookingId } = req.body;

    const options = {
        amount: amount * 100, // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_${bookingId}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
        return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
    }

    // Save initial payment record
    await Payment.create({
        booking: bookingId,
        user: req.user.id,
        amount,
        orderId: order.id,
        status: 'pending'
    });

    res.json({
        success: true,
        order
    });
});

// @desc    Verify Razorpay Payment
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
        .update(body.toString())
        .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
        // Update Payment record
        await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id },
            {
                transactionId: razorpay_payment_id,
                signature: razorpay_signature,
                status: 'success'
            }
        );

        // Update Booking status
        await Booking.findByIdAndUpdate(bookingId, {
            paymentStatus: 'paid',
            paymentId: razorpay_payment_id,
            status: 'confirmed'
        });

        res.json({
            success: true,
            message: "Payment verified successfully"
        });
    } else {
        await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id },
            { status: 'failed' }
        );

        res.status(400).json({
            success: false,
            message: "Payment verification failed"
        });
    }
});

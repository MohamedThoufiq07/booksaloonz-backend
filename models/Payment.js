const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    orderId: {
        type: String  // Razorpay order_id
    },
    transactionId: {
        type: String  // Razorpay payment_id
    },
    method: {
        type: String,
        enum: ['razorpay', 'cash', 'upi'],
        default: 'razorpay'
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'refunded'],
        default: 'pending'
    },
    signature: {
        type: String  // Razorpay signature for verification
    }
}, {
    timestamps: true
});

PaymentSchema.index({ booking: 1 });
PaymentSchema.index({ user: 1 });

module.exports = mongoose.model('payment', PaymentSchema);

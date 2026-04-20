const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    type: {
        type: String,
        enum: ['booking', 'product'],
        required: true
    },
    referenceId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'refunded'],
        default: 'pending'
    }
}, {
    timestamps: true
});

PaymentSchema.index({ user: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });
PaymentSchema.index({ referenceId: 1 });

module.exports = mongoose.model('payment', PaymentSchema);

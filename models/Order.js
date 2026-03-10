const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        name: String,
        price: Number,
        quantity: {
            type: Number,
            default: 1
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    shippingAddress: {
        name: String,
        phone: String,
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    deliveryType: {
        type: String,
        enum: ['home', 'pickup'],
        default: 'home'
    },
    paymentMethod: {
        type: String,
        default: 'razorpay'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    status: {
        type: String,
        enum: ['placed', 'accepted', 'shipping', 'delivered', 'cancelled'],
        default: 'placed'
    },
    assignedSalon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'salon'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('order', OrderSchema);

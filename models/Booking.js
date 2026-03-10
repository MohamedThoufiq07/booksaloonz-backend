const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'salon',
        required: true
    },
    service: {
        type: String,
        required: [true, 'Service is required']
    },
    serviceId: {
        type: String
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0
    },
    date: {
        type: String,
        required: [true, 'Date is required']
    },
    time: {
        type: String,
        required: [true, 'Time slot is required']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'waiting'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'refunded'],
        default: 'unpaid'
    },
    paymentId: {
        type: String
    },
    cancellationReason: {
        type: String
    },
    rejectionReason: {
        type: String
    }
}, {
    timestamps: true
});

// Compound index to prevent double-booking
BookingSchema.index({ salon: 1, date: 1, time: 1, status: 1 });
BookingSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('booking', BookingSchema);

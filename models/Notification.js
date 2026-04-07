const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'booking',
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    serviceName: {
        type: String,
        required: true
    },
    bookingTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'rejected'],
        default: 'pending'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    rejectionReason: {
        type: String
    }
}, {
    timestamps: true
});

NotificationSchema.index({ partnerId: 1, isRead: 1 });

module.exports = mongoose.model('notification', NotificationSchema);

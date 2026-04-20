const mongoose = require('mongoose');

const SalonOwnerSchema = new mongoose.Schema({
    ownerName: {
        type: String,
        required: [true, 'Owner name is required'],
        trim: true
    },
    salonName: {
        type: String,
        required: [true, 'Salon name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    phone: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        default: 'salonOwner'
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String
    },
    resetPasswordOTP: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }
}, {
    timestamps: true
});

SalonOwnerSchema.index({ email: 1 });

module.exports = mongoose.model('salonOwner', SalonOwnerSchema);

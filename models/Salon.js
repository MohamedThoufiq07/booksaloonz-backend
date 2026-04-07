const mongoose = require('mongoose');

const SalonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Salon name is required'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true
    },
    description: {
        type: String,
        default: 'A premium salon experience.',
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    category: {
        type: String,
        enum: ['unisex', 'men', 'women', 'spa', 'bridal'],
        default: 'unisex'
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    img: {
        type: String
    },
    images: [{
        type: String
    }],
    startingPrice: {
        type: Number,
        required: [true, 'Starting price is required'],
        min: 0
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'salonOwner',
        required: true
    },
    services: [{
        name: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number, default: 30 }, // minutes
        category: { type: String, default: 'general' }
    }],
    inventory: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        name: String,
        price: Number,
        stock: { type: Number, default: 0 },
        category: String
    }],
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [77.7567, 8.7139] } // [lng, lat] (Tirunelveli, India)
    },
    city: { type: String, default: 'Tirunelveli' },
    openingHours: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '21:00' }
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    totalBookings: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes for search, filter, and sort
SalonSchema.index({ rating: -1 });
SalonSchema.index({ startingPrice: 1 });
SalonSchema.index({ category: 1 });
SalonSchema.index({ isApproved: 1 });
SalonSchema.index({ location: '2dsphere' });
SalonSchema.index({ name: 'text', address: 'text' });

module.exports = mongoose.model('salon', SalonSchema);

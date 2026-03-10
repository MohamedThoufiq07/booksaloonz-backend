const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    salon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'salon',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0
    },
    duration: {
        type: Number,
        required: [true, 'Duration in minutes is required'],
        default: 30
    },
    category: {
        type: String,
        required: true,
        default: 'General'
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

ServiceSchema.index({ salon: 1 });
ServiceSchema.index({ category: 1 });

module.exports = mongoose.model('service', ServiceSchema);

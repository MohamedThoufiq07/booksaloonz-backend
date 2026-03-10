const mongoose = require('mongoose');

const AIHairReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    imageURL: {
        type: String,
        required: true
    },
    faceShape: {
        type: String,
        required: true,
        enum: ['Oval', 'Round', 'Square', 'Diamond', 'Heart', 'Rectangle', 'Oblong']
    },
    hairDensity: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Undetected']
    },
    hairTexture: {
        type: String,
        enum: ['Straight', 'Wavy', 'Curly', 'Coily', 'Undetected']
    },
    transformedImageURL: {
        type: String
    },
    fallbackImages: [{
        name: String,
        url: String
    }],
    fallbackSearchUsed: {
        type: Boolean,
        default: false
    },
    recommendations: [{
        name: String,
        image: String,
        description: String,
        reason: String
    }],
    confidence: {
        type: Number
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'Unknown']
    },
    explanation: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AIHairReport', AIHairReportSchema);

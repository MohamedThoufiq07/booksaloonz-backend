const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
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
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        maxlength: [500, 'Comment cannot exceed 500 characters'],
        trim: true
    }
}, {
    timestamps: true
});

// One review per user per salon
ReviewSchema.index({ user: 1, salon: 1 }, { unique: true });
ReviewSchema.index({ salon: 1 });

module.exports = mongoose.model('review', ReviewSchema);

const Review = require('../models/Review');
const Salon = require('../models/Salon');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create a review for a salon
// @route   POST /api/reviews
// @access  Private (user)
exports.createReview = asyncHandler(async (req, res) => {
    const { salonId, rating, comment } = req.body;

    if (!salonId || !rating) {
        return res.status(400).json({ success: false, message: 'Salon ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    // Check if user already reviewed this salon
    const existing = await Review.findOne({ user: req.user.id, salon: salonId });
    if (existing) {
        return res.status(400).json({ success: false, message: 'You have already reviewed this salon' });
    }

    const review = await Review.create({
        user: req.user.id,
        salon: salonId,
        rating,
        comment: comment || ''
    });

    // Auto-update salon rating
    const allReviews = await Review.find({ salon: salonId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Salon.findByIdAndUpdate(salonId, {
        rating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length
    });

    res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        review
    });
});

// @desc    Get reviews for a salon
// @route   GET /api/reviews/:salonId
// @access  Public
exports.getSalonReviews = asyncHandler(async (req, res) => {
    const reviews = await Review.find({ salon: req.params.salonId })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .lean();

    res.json({ success: true, count: reviews.length, reviews });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (owner or admin)
exports.deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
        return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const salonId = review.salon;
    await Review.findByIdAndDelete(req.params.id);

    // Recalculate salon rating
    const allReviews = await Review.find({ salon: salonId });
    const avgRating = allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
        : 0;
    await Salon.findByIdAndUpdate(salonId, {
        rating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length
    });

    res.json({ success: true, message: 'Review deleted' });
});

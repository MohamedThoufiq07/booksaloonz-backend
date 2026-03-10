const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const reviewController = require('../controllers/reviewController');

// POST /api/reviews — Create a review (logged in users only)
router.post('/', auth, reviewController.createReview);

// GET /api/reviews/:salonId — Get all reviews for a salon (public)
router.get('/:salonId', reviewController.getSalonReviews);

// DELETE /api/reviews/:id — Delete a review (owner or admin)
router.delete('/:id', auth, reviewController.deleteReview);

module.exports = router;

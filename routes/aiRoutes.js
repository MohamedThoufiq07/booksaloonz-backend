const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { hairAnalysis } = require('../controllers/aiController');

// @route   POST /api/ai/hair-analysis
// @desc    Suggest 5 hairstyles via Gemini with fallback
// @access  Public (Temporary for testing)
router.post('/hair-analysis', hairAnalysis);

module.exports = router;

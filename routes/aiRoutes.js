const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const { analyzeFaceAndHair, getHistory } = require('../controllers/aiController');

// Multer config
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @route   POST /api/ai/analyze
// @desc    Analyze face/hair and save report
// @access  Public/Private (Flexible)
router.post('/analyze', optionalAuth, upload.single('image'), analyzeFaceAndHair);

// @route   GET /api/ai/history
// @desc    Get user's AI analysis history
// @access  Private
router.get('/history', auth, getHistory);

module.exports = router;

/**
 * Hair Style Recommendation Routes
 * API endpoints for face analysis and hairstyle recommendations
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    analyzeFaceAndRecommend,
    getFaceShapes,
    getRecommendationsByShape
} = require('../controllers/hairStyleController');

// Configure multer for memory storage (buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
        }
    }
});

// POST /api/hairstyle/analyze - Upload face image and get recommendations
router.post('/analyze', upload.single('faceImage'), analyzeFaceAndRecommend);

// GET /api/hairstyle/shapes - Get all face shape descriptions
router.get('/shapes', getFaceShapes);

// GET /api/hairstyle/recommendations/:shape - Get recommendations by face shape
router.get('/recommendations/:shape', getRecommendationsByShape);

// Error handling for multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'FILE_TOO_LARGE',
                message: 'Image file is too large. Maximum size is 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: 'UPLOAD_ERROR',
            message: err.message
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            error: 'UPLOAD_ERROR',
            message: err.message
        });
    }
    next();
});

module.exports = router;

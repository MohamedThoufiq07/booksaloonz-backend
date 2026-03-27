const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const {
    registerUser,
    loginUser,
    registerOwner,
    loginOwner,
    refreshToken,
    logout,
    changePassword,
    updateProfile,
    getMe
} = require('../controllers/authController');

// Validation Middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            success: false, 
            message: errors.array()[0].msg, // Return first error message for simplicity
            errors: errors.array() 
        });
    }
    next();
};

// Validation Rules
const signupValidation = [
    check('name', 'Name is required').not().isEmpty().trim(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    validate
];

const ownerSignupValidation = [
    check('ownerName', 'Owner name is required').not().isEmpty().trim(),
    check('salonName', 'Salon name is required').not().isEmpty().trim(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    validate
];

const loginValidation = [
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password is required').exists(),
    validate
];

const profileUpdateValidation = [
    check('email', 'Please include a valid email').optional().isEmail().normalizeEmail(),
    check('name', 'Name must be a string').optional().isString().trim(),
    validate
];

// Authentication Routes
router.post('/user/signup', signupValidation, registerUser);
router.post('/user/login', loginValidation, loginUser);
router.post('/partner/signup', ownerSignupValidation, registerOwner);
router.post('/partner/login', loginValidation, loginOwner);

// Session & Security
router.post('/refresh', [
    check('refreshToken', 'Refresh token is required').not().isEmpty(),
    validate
], refreshToken);

router.post('/logout', auth, logout);
router.put('/change-password', [
    auth,
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
    validate
], changePassword);

router.put('/update-profile', [auth, profileUpdateValidation], updateProfile);
router.get('/me', auth, getMe);

module.exports = router;

const express = require('express');
const router = express.Router();
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

// Authentication Routes
router.post('/user/signup', registerUser);
router.post('/user/login', loginUser);
router.post('/partner/signup', registerOwner);
router.post('/partner/login', loginOwner);

// Session & Security
router.post('/refresh', refreshToken);
router.post('/logout', auth, logout);
router.put('/change-password', auth, changePassword);
router.put('/update-profile', auth, updateProfile);
router.get('/me', auth, getMe);

module.exports = router;

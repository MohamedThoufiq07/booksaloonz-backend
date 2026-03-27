const User = require('../models/User');
const SalonOwner = require('../models/SalonOwner');
const Salon = require('../models/Salon');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { sendWelcomeEmail } = require('../services/emailService');
const { generateTokens } = require('../utils/tokenUtils');

// @desc    Register User
// @route   POST /api/auth/user/signup
exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body;

    const emailLower = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    const existingOwner = await SalonOwner.findOne({ email: emailLower });

    if (existingUser || existingOwner) {
        return res.status(400).json({ success: false, message: "Email already exists in our system." });
    }

    const user = new User({ name, email: emailLower, password, phone });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    const { accessToken, refreshToken } = generateTokens(user._id, 'user');
    user.refreshToken = refreshToken;

    await user.save();

    // Async welcome email
    sendWelcomeEmail(user.email, user.name).catch(console.error);

    res.status(201).json({
        success: true,
        token: accessToken,
        refreshToken,
        user: { id: user._id, name: user.name, email: user.email, role: 'user' }
    });
});

// @desc    Login User
exports.loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.isBlocked) {
        return res.status(403).json({ success: false, message: "Your account has been blocked. Contact support." });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
        success: true,
        message: "Login successful",
        token: accessToken,
        refreshToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
});

// @desc    Login Partner
exports.loginOwner = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const owner = await SalonOwner.findOne({ email: email.toLowerCase() });

    if (!owner || !(await bcrypt.compare(password, owner.password))) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (owner.isBlocked) {
        return res.status(403).json({ success: false, message: "Your account has been blocked. Contact support." });
    }

    const { accessToken, refreshToken } = generateTokens(owner._id, owner.role);
    owner.refreshToken = refreshToken;
    await owner.save();

    res.json({
        success: true,
        message: "Login successful",
        token: accessToken,
        refreshToken,
        user: { id: owner._id, name: owner.ownerName, email: owner.email, role: owner.role, salonName: owner.salonName }
    });
});

// @desc    Register Salon Partner
exports.registerOwner = asyncHandler(async (req, res) => {
    const { ownerName, email, password, salonName, address, salonPhoto, startingPrice, phone } = req.body;

    const emailLower = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: emailLower });
    const existingOwner = await SalonOwner.findOne({ email: emailLower });
    if (existingUser || existingOwner) {
        return res.status(400).json({ success: false, message: "Partner email already exists" });
    }

    const owner = new SalonOwner({ ownerName, email: emailLower, password, salonName, phone });
    const salt = await bcrypt.genSalt(10);
    owner.password = await bcrypt.hash(password, salt);

    const { accessToken, refreshToken } = generateTokens(owner._id, 'salonOwner');
    owner.refreshToken = refreshToken;
    await owner.save();

    // Create Salon (Unapproved by default for SaaS level)
    const salon = new Salon({
        name: salonName,
        address,
        img: salonPhoto || '',
        startingPrice: startingPrice || 0,
        owner: owner._id,
        isApproved: false
    });
    await salon.save();

    // Async welcome email
    sendWelcomeEmail(owner.email, owner.ownerName).catch(console.error);

    res.status(201).json({
        success: true,
        token: accessToken,
        refreshToken,
        user: { id: owner._id, name: owner.ownerName, email: owner.email, role: 'salonOwner', salonName: owner.salonName }
    });
});

// @desc    Refresh Token
// @route   POST /api/auth/refresh
exports.refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

    let decoded;
    try {
        if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET missing');
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    let user;
    if (decoded.role === 'salonOwner') {
        user = await SalonOwner.findById(decoded.id);
    } else {
        user = await User.findById(decoded.id);
    }

    if (!user || user.refreshToken !== refreshToken || user.isBlocked) {
        return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    const tokens = generateTokens(user._id, user.role);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
        success: true,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken
    });
});

// @desc    Logout
exports.logout = asyncHandler(async (req, res) => {
    let user;
    if (req.user.role === 'salonOwner') {
        user = await SalonOwner.findById(req.user.id);
    } else {
        user = await User.findById(req.user.id);
    }

    if (user) {
        user.refreshToken = null;
        await user.save();
    }

    res.json({ success: true, message: 'Logged out successfully' });
});

// @desc    Change Password
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    let user;
    if (req.user.role === 'salonOwner') {
        user = await SalonOwner.findById(req.user.id);
    } else {
        user = await User.findById(req.user.id);
    }

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.refreshToken = null; // Force re-login on all devices
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
});

// @desc    Update Profile Details
exports.updateProfile = asyncHandler(async (req, res) => {
    const { name, email, phone } = req.body;

    let user;
    if (req.user.role === 'salonOwner') {
        user = await SalonOwner.findById(req.user.id);
    } else {
        user = await User.findById(req.user.id);
    }

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) {
        if (req.user.role === 'salonOwner') user.ownerName = name;
        else user.name = name;
    }

    if (email) {
        const emailLower = email.toLowerCase().trim();
        // Check if email is already taken by ANOTHER user
        const existingUser = await User.findOne({ email: emailLower, _id: { $ne: user._id } });
        const existingOwner = await SalonOwner.findOne({ email: emailLower, _id: { $ne: user._id } });

        if (existingUser || existingOwner) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }
        user.email = emailLower;
    }

    if (phone) user.phone = phone;

    await user.save();

    res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
            id: user._id,
            name: user.name || user.ownerName,
            email: user.email,
            role: user.role,
            phone: user.phone
        }
    });
});

// @desc    Get Current User
exports.getMe = asyncHandler(async (req, res) => {
    let user;
    if (req.user.role === 'salonOwner') {
        user = await SalonOwner.findById(req.user.id).select('-password -refreshToken');
    } else {
        user = await User.findById(req.user.id).select('-password -refreshToken');
    }

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
        success: true,
        user: {
            id: user._id,
            name: user.name || user.ownerName,
            email: user.email,
            role: user.role,
            salonName: user.salonName,
            phone: user.phone
        }
    });
});

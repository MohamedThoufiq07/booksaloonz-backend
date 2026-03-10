const User = require('../models/User');
const Salon = require('../models/Salon');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (admin)
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const [totalUsers, totalSalons, totalBookings, approvedSalons, pendingSalons] = await Promise.all([
        User.countDocuments({ role: 'user' }),
        Salon.countDocuments(),
        Booking.countDocuments(),
        Salon.countDocuments({ isApproved: true }),
        Salon.countDocuments({ isApproved: false })
    ]);

    // Revenue: sum of completed bookings
    const revenueResult = await Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Monthly bookings for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyBookings = await Booking.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                count: { $sum: 1 },
                revenue: { $sum: '$price' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
        success: true,
        stats: {
            totalUsers,
            totalSalons,
            approvedSalons,
            pendingSalons,
            totalBookings,
            totalRevenue,
            monthlyBookings
        }
    });
});

// @desc    Get all users (for admin)
// @route   GET /api/admin/users
// @access  Private (admin)
exports.getAllUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
        User.find({ role: { $ne: 'admin' } })
            .select('-password -refreshToken')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments({ role: { $ne: 'admin' } })
    ]);

    res.json({
        success: true,
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
});

// @desc    Block/Unblock a user
// @route   PUT /api/admin/users/:id/block
// @access  Private (admin)
exports.toggleBlockUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
        success: true,
        message: user.isBlocked ? 'User blocked' : 'User unblocked',
        isBlocked: user.isBlocked
    });
});

// @desc    Get all salons (including unapproved)
// @route   GET /api/admin/salons
// @access  Private (admin)
exports.getAllSalons = asyncHandler(async (req, res) => {
    const salons = await Salon.find()
        .populate('owner', 'ownerName email')
        .sort({ createdAt: -1 })
        .lean();

    res.json({ success: true, salons });
});

// @desc    Approve or reject a salon
// @route   PUT /api/admin/salons/:id/approve
// @access  Private (admin)
exports.toggleApproveSalon = asyncHandler(async (req, res) => {
    const salon = await Salon.findById(req.params.id);
    if (!salon) {
        return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    salon.isApproved = !salon.isApproved;
    await salon.save();

    res.json({
        success: true,
        message: salon.isApproved ? 'Salon approved' : 'Salon rejected',
        isApproved: salon.isApproved
    });
});

// @desc    Get all bookings (admin view)
// @route   GET /api/admin/bookings
// @access  Private (admin)
exports.getAllBookings = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [bookings, total] = await Promise.all([
        Booking.find(filter)
            .populate('user', 'name email')
            .populate('salon', 'name address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Booking.countDocuments(filter)
    ]);

    res.json({
        success: true,
        bookings,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
});

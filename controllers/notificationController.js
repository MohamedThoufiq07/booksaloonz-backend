const Notification = require('../models/Notification');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const Salon = require('../models/Salon');

// @desc    Get unread notifications for the logged-in partner
// @route   GET /api/notifications/partner
// @access  Private (salonOwner)
exports.getPartnerNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
        partnerId: req.user.id,
        isRead: false
    }).sort({ createdAt: -1 }).lean();

    res.json({
        success: true,
        count: notifications.length,
        notifications
    });
});

// @desc    Accept a booking via notification
// @route   PATCH /api/notifications/:id/accept
// @access  Private (salonOwner)
exports.acceptNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.partnerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update booking status
    const booking = await Booking.findById(notification.bookingId);
    if (booking) {
        booking.status = 'confirmed';
        await booking.save();
    }

    // Mark notification as read
    notification.status = 'confirmed';
    notification.isRead = true;
    await notification.save();

    res.json({
        success: true,
        message: 'Booking confirmed successfully',
        notification
    });
});

// @desc    Reject a booking via notification
// @route   PATCH /api/notifications/:id/reject
// @access  Private (salonOwner)
exports.rejectNotification = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (notification.partnerId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update booking status and save rejection reason
    const booking = await Booking.findById(notification.bookingId);
    if (booking) {
        booking.status = 'cancelled';
        booking.rejectionReason = reason || 'Rejected by partner';
        await booking.save();
    }

    // Mark notification as read
    notification.status = 'rejected';
    notification.isRead = true;
    notification.rejectionReason = reason || 'Rejected by partner';
    await notification.save();

    res.json({
        success: true,
        message: 'Booking rejected',
        notification
    });
});

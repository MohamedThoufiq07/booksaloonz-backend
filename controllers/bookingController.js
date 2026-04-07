const Booking = require('../models/Booking');
const Salon = require('../models/Salon');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { isSlotAvailable, getAvailableSlots } = require('../services/slotService');
const { sendBookingConfirmation, sendCancellationEmail } = require('../services/emailService');

// @desc    Get available slots for a salon on a date
// @route   GET /api/bookings/slots/:salonId/:date
// @access  Public
exports.getSlots = asyncHandler(async (req, res) => {
    const { salonId, date } = req.params;

    // Prevent past date booking
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
        return res.status(400).json({
            success: false,
            message: 'Cannot book for past dates'
        });
    }

    const salon = await Salon.findById(salonId).select('openingHours name').lean();
    if (!salon) {
        return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    const slots = await getAvailableSlots(salonId, date, salon.openingHours || {});

    res.json({ success: true, date, salonName: salon.name, slots });
});

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = asyncHandler(async (req, res) => {
    const { salonId, service, price, date, time, serviceId } = req.body;

    // Validation
    if (!salonId || !service || !price || !date || !time) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: salonId, service, price, date, time'
        });
    }

    // Prevent past date booking
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
        return res.status(400).json({
            success: false,
            message: 'Cannot book for past dates'
        });
    }

    // Check slot availability (PREVENT DOUBLE BOOKING)
    const available = await isSlotAvailable(salonId, date, time);
    if (!available) {
        return res.status(409).json({
            success: false,
            message: 'This time slot is already booked. Please choose another.'
        });
    }

    const booking = await Booking.create({
        user: req.user.id,
        salon: salonId,
        service,
        serviceId: serviceId || '',
        price,
        date,
        time,
        status: 'confirmed',
        paymentStatus: 'unpaid'
    });

    // Increment salon's total bookings
    await Salon.findByIdAndUpdate(salonId, { $inc: { totalBookings: 1 } });

    // Send confirmation email (async, don't block response)
    const user = await User.findById(req.user.id).select('name email').lean();
    const salon = await Salon.findById(salonId).select('name owner').lean();

    sendBookingConfirmation(user.email, {
        userName: user.name,
        salonName: salon.name,
        service,
        date,
        time,
        price
    }).catch(() => { }); // fire-and-forget

    // Create notification for the partner (fire-and-forget)
    if (salon.owner) {
        Notification.create({
            partnerId: salon.owner,
            userId: req.user.id,
            bookingId: booking._id,
            userName: user.name,
            serviceName: service,
            bookingTime: `${date} at ${time}`,
            status: 'pending',
            isRead: false
        }).catch(() => { });
    }

    res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking
    });
});

// @desc    Get user's bookings
// @route   GET /api/bookings/my
// @access  Private
exports.getMyBookings = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { user: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const [bookings, total] = await Promise.all([
        Booking.find(filter)
            .populate('salon', 'name address img')
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

// @desc    Get salon owner's bookings
// @route   GET /api/bookings/salon/:salonId
// @access  Private (salonOwner)
exports.getSalonBookings = asyncHandler(async (req, res) => {
    // SECURITY: Ensure the requester OWNS the salon they are querying (Prevent IDOR)
    const salon = await Salon.findById(req.params.salonId).select('owner').lean();
    if (!salon || salon.owner.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to view bookings for this salon' });
    }

    const bookings = await Booking.find({ salon: req.params.salonId })
        .populate('user', 'name email phone')
        .sort({ date: -1, time: -1 })
        .lean();

    res.json({ success: true, count: bookings.length, bookings });
});

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Only the booking owner or admin can cancel
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status === 'cancelled') {
        return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    if (booking.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Cannot cancel completed booking' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || 'User cancelled';
    await booking.save();

    // Send cancellation email
    const user = await User.findById(booking.user).select('name email').lean();
    const salon = await Salon.findById(booking.salon).select('name').lean();

    sendCancellationEmail(user.email, {
        userName: user.name,
        salonName: salon?.name || 'Unknown',
        service: booking.service,
        date: booking.date,
        time: booking.time
    }).catch(() => { });

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
});

// @desc    Reschedule a booking
// @route   PUT /api/bookings/:id/reschedule
// @access  Private
exports.rescheduleBooking = asyncHandler(async (req, res) => {
    const { date, time } = req.body;

    if (!date || !time) {
        return res.status(400).json({ success: false, message: 'New date and time are required' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Cannot reschedule this booking' });
    }

    // Prevent past date
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
        return res.status(400).json({ success: false, message: 'Cannot reschedule to a past date' });
    }

    // Check new slot availability
    const available = await isSlotAvailable(booking.salon, date, time);
    if (!available) {
        return res.status(409).json({ success: false, message: 'New time slot is not available' });
    }

    booking.date = date;
    booking.time = time;
    await booking.save();

    res.json({ success: true, message: 'Booking rescheduled successfully', booking });
});

// @desc    Accept a booking (Partner)
// @route   PUT /api/bookings/:id/accept
// @access  Private (salonOwner)
exports.acceptBooking = asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('user', 'name email');

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'confirmed';
    await booking.save();

    // Send confirmation email
    const salon = await Salon.findById(booking.salon).select('name').lean();
    if (booking.user && booking.user.email) {
        sendBookingConfirmation(booking.user.email, {
            userName: booking.user.name,
            salonName: salon?.name || 'Salon',
            service: booking.service,
            date: booking.date,
            time: booking.time,
            price: booking.price
        }).catch(() => { });
    }

    res.json({ success: true, message: 'Booking accepted', booking });
});

// @desc    Reject a booking (Partner) — moves to waiting list
// @route   PUT /api/bookings/:id/reject
// @access  Private (salonOwner)
exports.rejectBooking = asyncHandler(async (req, res) => {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'waiting';
    booking.rejectionReason = reason || 'No reason provided';
    await booking.save();

    res.json({ success: true, message: 'Booking moved to waiting list', booking });
});

// @desc    Get all bookings for the partner's salons
// @route   GET /api/bookings/partner
// @access  Private (salonOwner)
exports.getPartnerBookings = asyncHandler(async (req, res) => {
    // Find all salons owned by this partner
    const salons = await Salon.find({ owner: req.user.id }).select('_id').lean();
    const salonIds = salons.map(s => s._id);

    const bookings = await Booking.find({ salon: { $in: salonIds } })
        .populate('user', 'name email phone')
        .populate('salon', 'name address')
        .sort({ createdAt: -1 })
        .lean();

    // Calculate stats
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    const uniqueUsers = new Set(bookings.map(b => b.user?._id?.toString())).size;

    res.json({
        success: true,
        bookings,
        stats: {
            totalBookings,
            totalRevenue,
            activeCustomers: uniqueUsers,
            averageRating: 0
        }
    });
});

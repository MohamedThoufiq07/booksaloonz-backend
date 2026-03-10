const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const bookingController = require('../controllers/bookingController');

// GET /api/bookings/slots/:salonId/:date — Get available time slots (public)
router.get('/slots/:salonId/:date', bookingController.getSlots);

// POST /api/bookings — Create booking (auth required)
router.post('/', auth, bookingController.createBooking);

// GET /api/bookings/my — Get current user's bookings
router.get('/my', auth, bookingController.getMyBookings);

// GET /api/bookings/salon/:salonId — Get bookings for a salon (owner)
router.get('/salon/:salonId', auth, bookingController.getSalonBookings);

// PUT /api/bookings/:id/cancel — Cancel a booking
router.put('/:id/cancel', auth, bookingController.cancelBooking);

// PUT /api/bookings/:id/reschedule — Reschedule a booking
router.put('/:id/reschedule', auth, bookingController.rescheduleBooking);

// GET /api/bookings/partner — Get all bookings for partner's salons
router.get('/partner', auth, bookingController.getPartnerBookings);

// PUT /api/bookings/:id/accept — Partner accepts a booking
router.put('/:id/accept', auth, bookingController.acceptBooking);

// PUT /api/bookings/:id/reject — Partner rejects a booking (waiting list)
router.put('/:id/reject', auth, bookingController.rejectBooking);

module.exports = router;

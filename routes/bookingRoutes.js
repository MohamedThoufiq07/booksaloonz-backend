const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const roleAuth = require('../middleware/roleAuth');
const bookingController = require('../controllers/bookingController');

// Validation Middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
};

// Validation Rules
const bookingValidation = [
    check('salonId', 'Invalid Salon ID').isMongoId(),
    check('service', 'Service name is required').not().isEmpty(),
    check('price', 'Price must be a number').isNumeric(),
    check('date', 'Please provide a valid date').isISO8601(),
    check('time', 'Time is required').not().isEmpty(),
    validate
];

// User Routes
router.get('/slots/:salonId/:date', bookingController.getSlots);
router.post('/', [auth, bookingValidation], bookingController.createBooking);
router.get('/my', auth, bookingController.getMyBookings);
router.put('/:id/cancel', auth, bookingController.cancelBooking);
router.put('/:id/reschedule', [
    auth, 
    check('date', 'Valid date required').isISO8601(),
    check('time', 'Time required').not().isEmpty(),
    validate
], bookingController.rescheduleBooking);

// Partner/Owner Routes
router.get('/salon/:salonId', [auth, roleAuth('salonOwner')], bookingController.getSalonBookings);
router.get('/partner', [auth, roleAuth('salonOwner')], bookingController.getPartnerBookings);
router.put('/:id/accept', [auth, roleAuth('salonOwner')], bookingController.acceptBooking);
router.put('/:id/reject', [auth, roleAuth('salonOwner')], bookingController.rejectBooking);

module.exports = router;

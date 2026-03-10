const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const roleAuth = require('../middleware/roleAuth');
const adminController = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(auth);
router.use(roleAuth('admin'));

// GET /api/admin/stats — Dashboard overview
router.get('/stats', adminController.getDashboardStats);

// GET /api/admin/users — List all users
router.get('/users', adminController.getAllUsers);

// PUT /api/admin/users/:id/block — Block/unblock user
router.put('/users/:id/block', adminController.toggleBlockUser);

// GET /api/admin/salons — List all salons (including unapproved)
router.get('/salons', adminController.getAllSalons);

// PUT /api/admin/salons/:id/approve — Approve/reject salon
router.put('/salons/:id/approve', adminController.toggleApproveSalon);

// GET /api/admin/bookings — List all bookings
router.get('/bookings', adminController.getAllBookings);

module.exports = router;

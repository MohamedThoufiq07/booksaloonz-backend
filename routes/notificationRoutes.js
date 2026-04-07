const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const roleAuth = require('../middleware/roleAuth');
const notificationController = require('../controllers/notificationController');

// Partner notification routes
router.get('/partner', [auth, roleAuth('salonOwner')], notificationController.getPartnerNotifications);
router.patch('/:id/accept', [auth, roleAuth('salonOwner')], notificationController.acceptNotification);
router.patch('/:id/reject', [auth, roleAuth('salonOwner')], notificationController.rejectNotification);

module.exports = router;

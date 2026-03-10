const express = require('express');
const router = express.Router();
const {
    placeOrder,
    verifyPayment,
    getPartnerOrders,
    acceptOrder,
    getOrder
} = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');
const roleAuth = require('../middleware/roleAuth');

// All order routes require authentication
router.use(auth);

router.post('/', placeOrder);
router.get('/:id', getOrder);
router.post('/verify', verifyPayment);

// Partner routes
router.get('/partner', roleAuth('salonOwner'), getPartnerOrders);
router.put('/:id/accept', roleAuth('salonOwner'), acceptOrder);

module.exports = router;

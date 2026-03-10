const express = require('express');
const router = express.Router();
const {
    getSalonServices,
    addService,
    updateService,
    deleteService
} = require('../controllers/serviceController');
const auth = require('../middleware/authMiddleware');
const roleAuth = require('../middleware/roleAuth');

router.get('/salon/:salonId', getSalonServices);

// All other routes require authentication
router.use(auth);

router.post('/', roleAuth('salonOwner', 'admin'), addService);
router.put('/:id', roleAuth('salonOwner', 'admin'), updateService);
router.delete('/:id', roleAuth('salonOwner', 'admin'), deleteService);

module.exports = router;

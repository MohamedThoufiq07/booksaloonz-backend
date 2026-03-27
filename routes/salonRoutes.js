const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const roleAuth = require('../middleware/roleAuth');
const { 
    getSalons, searchSalons, addSalon, getSalonById, updateSalon, deleteSalon, getSalonsByProduct, getMySalon 
} = require('../controllers/salonController');

// Validation Middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    next();
};

// Validation Rules
const salonValidation = [
    check('name', 'Salon name is required').not().isEmpty().trim(),
    check('address', 'Address is required').not().isEmpty().trim(),
    check('startingPrice', 'Starting price must be a number').isNumeric(),
    validate
];

// Routes
router.get('/', getSalons);
router.get('/search', searchSalons);
router.get('/product/:productId', getSalonsByProduct);
router.get('/my/profile', [auth, roleAuth('salonOwner')], getMySalon);

// ✅ Owner/Admin Protected Routes
router.post('/', [auth, roleAuth('salonOwner', 'admin'), salonValidation], addSalon);
router.put('/:id', [auth, roleAuth('salonOwner', 'admin')], updateSalon);
router.delete('/:id', [auth, roleAuth('salonOwner', 'admin')], deleteSalon);

// ✅ GET nearby salons
router.get("/nearby", async (req, res) => {
    try {
        const { lat, lng, radius = 10000 } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                error: "Latitude and longitude are required" 
            });
        }

        let salons = await Salon.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseFloat(radius)
                }
            }
        }).limit(20);

        if (!salons || salons.length === 0) {
            // if no salons nearby, fallback to all salons 
            // the frontend will calculate the actual distance and display
            salons = await Salon.find().limit(20);
        }

        res.json({ success: true, salons });

    } catch (error) {
        console.error("Nearby salons error:", error.message);
        // Fallback: return all salons
        try {
            const allSalons = await Salon.find().limit(20);
            res.json({ success: true, salons: allSalons });
        } catch (err) {
            res.status(500).json({ success: false, error: "Failed to fetch salons" });
        }
    }
});

router.get('/:id', getSalonById);

module.exports = router;

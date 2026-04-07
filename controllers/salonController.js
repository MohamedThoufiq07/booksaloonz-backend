const Salon = require('../models/Salon');
const searchAlgorithm = require('../algorithms/searchAlgorithm');
const ltrRanking = require('../algorithms/ltrRanking');
const asyncHandler = require('../utils/asyncHandler');

// @desc Get All Salons (with Ranking)
exports.getSalons = asyncHandler(async (req, res) => {
    let salons = await Salon.find().lean();
    
    // Repair coordinates for mock/placeholders in Tirunelveli
    salons = salons.map(salon => {
        if (salon.location && salon.location.coordinates[0] === 0 && salon.location.coordinates[1] === 0) {
            return {
                ...salon,
                location: {
                    ...salon.location,
                    coordinates: [77.7567, 8.7139] // Tirunelveli [Lng, Lat]
                }
            };
        }
        return salon;
    });

    salons = ltrRanking(salons); // Apply LTR logic
    res.json({
        success: true,
        data: salons
    });
});

// @desc Search Salons
exports.searchSalons = asyncHandler(async (req, res) => {
    const { query } = req.query;
    let salons = await Salon.find().lean();
    // searchAlgorithm now includes BERT search + LTR ranking in one pipeline
    salons = searchAlgorithm(salons, query);
    res.json({
        success: true,
        data: salons
    });
});

// @desc Add Salon (Owner only)
exports.addSalon = asyncHandler(async (req, res) => {
    const { name, address, rating, img, startingPrice } = req.body;
    
    // Duplicate Salon Check
    const existingSalon = await Salon.findOne({ owner: req.user.id });
    if (existingSalon) {
        return res.status(400).json({
            success: false,
            message: "Salon already exists for this owner"
        });
    }

    const newSalon = new Salon({
        name, address, rating, img, startingPrice, owner: req.user.id
    });
    await newSalon.save();
    res.json({
        success: true,
        data: newSalon
    });
});

// @desc Get Salon by ID
exports.getSalonById = async (req, res) => {
    try {
        const salon = await Salon.findById(req.params.id);
        if (!salon) return res.status(404).json({
            success: false,
            message: 'Salon not found'
        });
        res.json({
            success: true,
            data: salon
        });
    } catch (err) {
        console.error("Get Salon by ID Error:", err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc Update Salon (Owner only)
exports.updateSalon = async (req, res) => {
    try {
        // Validation: Service duration cannot exceed 30 minutes
        if (req.body.services && Array.isArray(req.body.services)) {
            const hasInvalidDuration = req.body.services.some(service => service.duration > 30);
            if (hasInvalidDuration) {
                return res.status(400).json({
                    success: false,
                    message: "Service duration cannot exceed 30 minutes"
                });
            }
        }

        let salon = await Salon.findById(req.params.id);
        if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

        // Check ownership
        if (salon.owner.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized to update this salon' });
        }

        salon = await Salon.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            data: salon
        });
    } catch (err) {
        console.error("Update Salon Error:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc Delete Salon (Owner only)
exports.deleteSalon = async (req, res) => {
    try {
        const salon = await Salon.findById(req.params.id);
        if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

        // Check ownership
        if (salon.owner.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Not authorized to delete this salon' });
        }

        await salon.deleteOne(); // updated from remove() which is deprecated in newer Mongoose

        res.json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.error("Delete Salon Error:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc Get Salons that sell a specific product
// @route GET /api/salons/product/:productId
exports.getSalonsByProduct = async (req, res) => {
    try {
        let { productId } = req.params;

        // ID Repair for old dummy product IDs from legacy cart
        if (productId && (typeof productId === 'number' || (typeof productId === 'string' && productId.length < 24))) {
            const base = "65d8f1e00000000000000000";
            const numStr = productId.toString();
            productId = base.slice(0, 24 - numStr.length) + numStr;
        }

        const salons = await Salon.find({
            'inventory.product': productId
        }).lean();

        res.json({
            success: true,
            data: salons
        });
    } catch (err) {
        console.error("Get Salons by Product Error:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc Get My Salon (Owner only)
// @route GET /api/salons/my/profile
exports.getMySalon = asyncHandler(async (req, res) => {
    const salon = await Salon.findOne({ owner: req.user.id });
    if (!salon) {
        return res.status(404).json({ success: false, message: 'You do not have a salon registered yet' });
    }
    res.json({
        success: true,
        data: salon
    });
});

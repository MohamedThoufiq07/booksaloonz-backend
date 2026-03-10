const Service = require('../models/Service');
const Salon = require('../models/Salon');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all services for a salon
// @route   GET /api/services/salon/:salonId
// @access  Public
exports.getSalonServices = asyncHandler(async (req, res) => {
    const services = await Service.find({
        salon: req.params.salonId,
        isActive: true
    }).lean();

    res.json({
        success: true,
        count: services.length,
        services
    });
});

// @desc    Add a new service to a salon
// @route   POST /api/services
// @access  Private (salonOwner)
exports.addService = asyncHandler(async (req, res) => {
    const { salonId, name, price, duration, category, description } = req.body;

    // Verify salon belongs to owner
    const salon = await Salon.findById(salonId);
    if (!salon) {
        return res.status(404).json({ success: false, message: 'Salon not found' });
    }

    if (salon.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to manage this salon' });
    }

    const service = await Service.create({
        salon: salonId,
        name,
        price,
        duration,
        category,
        description
    });

    res.status(201).json({
        success: true,
        service
    });
});

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private (salonOwner)
exports.updateService = asyncHandler(async (req, res) => {
    let service = await Service.findById(req.params.id).populate('salon');

    if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Auth check
    if (service.salon.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    service = await Service.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.json({
        success: true,
        service
    });
});

// @desc    Delete a service (Soft delete by default)
// @route   DELETE /api/services/:id
// @access  Private (salonOwner)
exports.deleteService = asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id).populate('salon');

    if (!service) {
        return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (service.salon.owner.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // We use soft delete for historical booking consistency
    service.isActive = false;
    await service.save();

    res.json({
        success: true,
        message: 'Service deleted (deactivated)'
    });
});

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Salon = require('../models/Salon');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { sendOrderConfirmation } = require('../services/emailService');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder'
});

// @desc    Place a new order (INITIATE)
// @route   POST /api/orders
exports.placeOrder = asyncHandler(async (req, res) => {
    try {
        const { items, totalAmount, shippingAddress, deliveryType, assignedSalon, paymentMethod } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No items in cart' });
        }

        console.log('📦 Placing order for user:', req.user.id);

        // Sanitize and process items to ensure valid ObjectIds for the database
        const processedItems = items.map(item => {
            let productId = item.product;

            // If the ID is a simple number or too short (mock data), convert it
            if (typeof productId === 'number' || (typeof productId === 'string' && productId.length < 24)) {
                const base = "65d8f1e00000000000000000";
                const numStr = productId.toString();
                productId = base.slice(0, 24 - numStr.length) + numStr;
            }

            return {
                ...item,
                product: new mongoose.Types.ObjectId(productId)
            };
        });

        const orderData = {
            user: new mongoose.Types.ObjectId(req.user.id),
            items: processedItems,
            totalAmount: Number(totalAmount),
            deliveryType,
            paymentMethod,
            paymentStatus: (paymentMethod === 'card' || paymentMethod === 'upi') ? 'paid' : 'pending',
            status: 'placed'
        };

        // Only add shippingAddress if it's home delivery
        if (deliveryType === 'home' && shippingAddress) {
            orderData.shippingAddress = shippingAddress;
        }

        // Only add assignedSalon if it's a pickup with a valid ID
        if (deliveryType === 'pickup' && assignedSalon && assignedSalon.length === 24) {
            orderData.assignedSalon = new mongoose.Types.ObjectId(assignedSalon);
        }

        const order = await Order.create(orderData);
        console.log('✅ Order created successfully:', order._id);

        // Send email notification (async)
        const user = await User.findById(req.user.id).select('name email');
        const salon = order.assignedSalon ? await Salon.findById(order.assignedSalon).select('name') : null;

        if (user && user.email) {
            sendOrderConfirmation(user.email, {
                userName: user.name,
                orderId: order._id,
                totalAmount: order.totalAmount,
                deliveryType: order.deliveryType,
                items: order.items,
                shippingAddress: order.shippingAddress,
                salonName: salon?.name
            }).catch(e => console.error('📧 Order Email Error:', e.message));
        }

        res.status(201).json({
            success: true,
            order
        });
    } catch (error) {
        console.error('❌ CRITICAL Order Error:', error);
        res.status(500).json({
            success: false,
            message: 'Order placement failed. Check your cart items.',
            error: error.message
        });
    }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
exports.getOrder = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name email phone')
        .populate('assignedSalon', 'name address phone');

    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
        success: true,
        order
    });
});

// @desc    Verify Payment and Assign to nearby salon (Optional logic)
exports.verifyPayment = asyncHandler(async (req, res) => {
    const { razorpay_payment_id, orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    res.json({
        success: true,
        message: 'Payment verified.',
        order
    });
});

// @desc    Get orders for a specific salon (to accept)
// @route   GET /api/orders/partner
exports.getPartnerOrders = asyncHandler(async (req, res) => {
    const salon = await Salon.findOne({ owner: req.user.id });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    // Orders in same city that are 'placed'
    // Include both 'paid' orders and 'salon' (Pay at salon) orders that are 'pending'
    const orders = await Order.find({
        'shippingAddress.city': salon.city,
        status: 'placed',
        $or: [
            { paymentStatus: 'paid' },
            { paymentMethod: 'salon', paymentStatus: 'pending' }
        ]
    })
        .populate('user', 'name phone')
        .sort({ createdAt: -1 });

    res.json({
        success: true,
        data: orders
    });
});

// @desc    Accept an order
// @route   PUT /api/orders/:id/accept
exports.acceptOrder = asyncHandler(async (req, res) => {
    const salon = await Salon.findOne({ owner: req.user.id });
    if (!salon) return res.status(404).json({ success: false, message: 'Salon not found' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.status !== 'placed') {
        return res.status(400).json({ success: false, message: 'Order already accepted or cancelled' });
    }

    order.status = 'accepted';
    order.assignedSalon = salon._id;
    await order.save();

    res.json({
        success: true,
        message: 'Order accepted successfully',
        data: order
    });
});

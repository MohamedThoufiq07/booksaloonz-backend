const Product = require('../models/Product');
const recommendationAlgorithm = require('../algorithms/recommendationAlgorithm');

// @desc Get Products
exports.getProducts = async (req, res) => {
    try {
        const { category } = req.query;
        let query = {};
        if (category) query.category = category;

        let products = await Product.find(query);
        res.json({
            success: true,
            data: products
        });
    } catch (err) {
        console.error("Get Products Error:", err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc Get Recommended Products
exports.getRecommended = async (req, res) => {
    try {
        let products = await Product.find();
        const recommended = recommendationAlgorithm(products);
        res.json({
            success: true,
            data: recommended
        });
    } catch (err) {
        console.error("Get Recommended Error:", err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc Add Product
exports.addProduct = async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.json({
            success: true,
            data: product
        });
    } catch (err) {
        console.error("Add Product Error:", err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc Update Product (Admin/Owner)
exports.updateProduct = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        product = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.json({
            success: true,
            data: product
        });
    } catch (err) {
        console.error("Update Product Error:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc Delete Product (Admin/Owner)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        await product.deleteOne();

        res.json({
            success: true,
            data: {}
        });
    } catch (err) {
        console.error("Delete Product Error:", err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

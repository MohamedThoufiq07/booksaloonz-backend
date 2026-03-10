const express = require('express');
const router = express.Router();
const { getProducts, getRecommended, addProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const auth = require('../middleware/authMiddleware');

router.get('/', getProducts);
router.get('/recommended', getRecommended);
router.post('/', auth, addProduct);
router.put('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;

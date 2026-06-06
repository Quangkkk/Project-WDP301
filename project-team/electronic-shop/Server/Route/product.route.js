const express = require('express');
const router = express.Router();
const product = require('../Controller/product.controller')

router.get('/', product.getAllProducts);
router.get('/category/:id', product.getProductByCategory);
router.get('/brand/:id', product.getProductByBrand);
router.get('/:id', product.getProductById);

module.exports = router;

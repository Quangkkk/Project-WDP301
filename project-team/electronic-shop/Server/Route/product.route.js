const express = require('express');
const router = express.Router();
const product = require('../Controller/product.controller')

// router.post('/', product.addProduct);
router.get('/', product.getAllProducts);
// router.get('/category/:id', product.getProductByCategory);
// router.get('/brand/:id', product.getProductByBrand);
router.get('/:id', product.getProductById);
// router.put('/:id', product.updateProductById);
// router.delete('/:id', product.deleteProductById);

module.exports = router;

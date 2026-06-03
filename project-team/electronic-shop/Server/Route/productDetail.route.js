const express = require('express');
const router = express.Router();
const productDetail = require('../Controller/productDetail.controller')

router.post('/', productDetail.addProductDetail);
router.get('/:id', productDetail.getProductDetailById);
// router.get('/product/:id', productDetail.getProductDetailByProductId);
router.put('/:id', productDetail.updateProductDetailById);
router.delete('/:id', productDetail.deleteProductDetailById);

module.exports = router;

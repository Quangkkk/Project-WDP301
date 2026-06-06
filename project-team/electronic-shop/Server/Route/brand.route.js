const express = require('express');
const router = express.Router();
const brand = require("./../Controller/brand.controller")

router.post('/add', brand.addBrand);

router.get('/', brand.getAllBrand);

router.put('/:id', brand.updateBrandById);

router.delete('/:id', brand.deleteBrandById);

module.exports = router;

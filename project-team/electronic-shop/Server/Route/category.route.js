const express = require('express');
const router = express.Router();
const category = require('../Controller/category.controller')


router.post('/add',category.addCategory);
router.get('/', category.getAllCategory);
router.put('/:id', category.updateCategoryById);
router.delete('/:id', category.deleteCategoryById);

module.exports = router;

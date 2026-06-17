const express = require("express");
const category = require("../Controller/category.controller");

const router = express.Router();

router.post("/add", category.addCategory);
router.post("/", category.addCategory);
router.get("/", category.getAllCategory);
router.get("/:id", category.getCategoryById);
router.put("/:id", category.updateCategoryById);
router.delete("/:id", category.deleteCategoryById);

module.exports = router;
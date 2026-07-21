const express = require("express");
const category = require("../controller/category.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/add", verifyToken, authorizeRoles("MANAGER"), category.addCategory);
router.post("/", verifyToken, authorizeRoles("MANAGER"), category.addCategory);
router.get("/", category.getAllCategory);
router.get("/:id", category.getCategoryById);
router.put("/:id", verifyToken, authorizeRoles("MANAGER"), category.updateCategoryById);
router.delete("/:id", verifyToken, authorizeRoles("MANAGER"), category.deleteCategoryById);

module.exports = router;
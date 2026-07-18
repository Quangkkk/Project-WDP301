const express = require("express");
const category = require("../Controller/category.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Routes xem danh sach va chi tiet danh muc (Public)
router.get("/", category.getAllCategory);
router.get("/:id", category.getCategoryById);

// Routes quan ly danh muc (Chi ADMIN hoac MANAGER)
router.post("/add", verifyToken, authorizeRoles("ADMIN", "MANAGER"), category.addCategory);
router.post("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), category.addCategory);
router.put("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), category.updateCategoryById);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), category.deleteCategoryById);

module.exports = router;
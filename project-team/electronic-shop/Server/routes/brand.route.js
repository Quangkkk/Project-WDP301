const express = require("express");
const brand = require("../Controller/brand.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Routes xem danh sach va chi tiet thuong hieu (Public)
router.get("/", brand.getAllBrand);
router.get("/:id", brand.getBrandById);

// Routes quan ly thuong hieu (Chi ADMIN hoac MANAGER)
router.post("/add", verifyToken, authorizeRoles("ADMIN", "MANAGER"), brand.addBrand);
router.post("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), brand.addBrand);
router.put("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), brand.updateBrandById);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), brand.deleteBrandById);

module.exports = router;
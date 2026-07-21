const express = require("express");
const brand = require("../controller/brand.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/add", verifyToken, authorizeRoles("MANAGER"), brand.addBrand);
router.post("/", verifyToken, authorizeRoles("MANAGER"), brand.addBrand);
router.get("/", brand.getAllBrand);
router.get("/:id", brand.getBrandById);
router.put("/:id", verifyToken, authorizeRoles("MANAGER"), brand.updateBrandById);
router.delete("/:id", verifyToken, authorizeRoles("MANAGER"), brand.deleteBrandById);

module.exports = router;
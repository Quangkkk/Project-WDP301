const express = require("express");
const brand = require("../controller/brand.controller");

const router = express.Router();

router.post("/add", brand.addBrand);
router.post("/", brand.addBrand);
router.get("/", brand.getAllBrand);
router.get("/:id", brand.getBrandById);
router.put("/:id", brand.updateBrandById);
router.delete("/:id", brand.deleteBrandById);

module.exports = router;
const express = require("express");
const shippingMethod = require("../Controller/shippingMethod.controller");

const router = express.Router();

router.post("/", shippingMethod.createShippingMethod);
router.get("/", shippingMethod.getAllShippingMethods);
router.get("/:id", shippingMethod.getShippingMethodById);
router.put("/:id", shippingMethod.updateShippingMethodById);
router.delete("/:id", shippingMethod.deleteShippingMethodById);

module.exports = router;
const express = require("express");
const shippingMethod = require("../controller/shippingMethod.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/", verifyToken, authorizeRoles("MANAGER"), shippingMethod.createShippingMethod);
router.get("/", shippingMethod.getAllShippingMethods);
router.get("/:id", shippingMethod.getShippingMethodById);
router.put("/:id", verifyToken, authorizeRoles("MANAGER"), shippingMethod.updateShippingMethodById);
router.delete("/:id", verifyToken, authorizeRoles("MANAGER"), shippingMethod.deleteShippingMethodById);

module.exports = router;
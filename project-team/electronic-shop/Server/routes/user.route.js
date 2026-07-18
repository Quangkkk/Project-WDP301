const express = require("express");
const user = require("../Controller/user.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();
const adminOrManager = authorizeRoles("ADMIN", "MANAGER");

router.get("/profile", verifyToken, user.getProfile);
router.put("/profile", verifyToken, user.updateProfile);

router.post("/:userId/address", verifyToken, user.createAddress);
router.put("/address/:addressId", verifyToken, user.updateAddress);
router.delete("/address/:addressId", verifyToken, user.deleteAddress);

router.patch("/:id/change-password", verifyToken, user.changePassword);

router.post("/", verifyToken, adminOrManager, user.addUser);
router.get("/", verifyToken, adminOrManager, user.getAllUser);
router.get("/id/:id", verifyToken, adminOrManager, user.getUserById);
router.put("/:id", verifyToken, adminOrManager, user.updateUserById);
router.delete("/id/:id", verifyToken, adminOrManager, user.deleteUserById);

module.exports = router;

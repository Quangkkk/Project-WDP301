const express = require("express");
const user = require("../Controller/user.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();
const adminOnly = authorizeRoles("ADMIN");

router.get("/profile", verifyToken, user.getProfile);
router.put("/profile", verifyToken, user.updateProfile);

router.post("/:userId/address", verifyToken, user.createAddress);
router.put("/address/:addressId", verifyToken, user.updateAddress);
router.delete("/address/:addressId", verifyToken, user.deleteAddress);

router.patch("/:id/change-password", verifyToken, user.changePassword);

router.post("/", verifyToken, adminOnly, user.addUser);
router.get("/", verifyToken, adminOnly, user.getAllUser);
router.get("/id/:id", verifyToken, adminOnly, user.getUserById);
router.put("/:id", verifyToken, adminOnly, user.updateUserById);
router.delete("/id/:id", verifyToken, adminOnly, user.deleteUserById);

module.exports = router;
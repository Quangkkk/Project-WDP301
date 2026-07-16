const express = require("express");
const user = require("../Controller/user.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Route cho Profile ca nhan (phai login)
router.get("/profile", verifyToken, user.getProfile);
router.put("/profile", verifyToken, user.updateProfile);

// Route cho dia chi giao hang (phai login)
router.post("/:userId/address", verifyToken, user.createAddress);
router.put("/address/:addressId", verifyToken, user.updateAddress);
router.delete("/address/:addressId", verifyToken, user.deleteAddress);

// Route quan tri user (chi ADMIN hoac MANAGER)
router.post("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), user.addUser);
router.get("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), user.getAllUser);
router.get("/id/:id", verifyToken, user.getUserById);
router.put("/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), user.updateUserById);
router.delete("/id/:id", verifyToken, authorizeRoles("ADMIN", "MANAGER"), user.deleteUserById);

module.exports = router;
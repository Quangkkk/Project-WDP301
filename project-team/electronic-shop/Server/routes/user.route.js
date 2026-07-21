const express = require("express");
const user = require("../controller/user.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/:userId/address", verifyToken, user.createAddress);
router.put("/address/:addressId", verifyToken, user.updateAddress);
router.delete("/address/:addressId", verifyToken, user.deleteAddress);

router.post("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), user.addUser);
router.get("/", verifyToken, authorizeRoles("ADMIN", "MANAGER"), user.getAllUser);
router.get("/id/:id", verifyToken, user.getUserById);
router.get("/:id", verifyToken, user.getUserById);
router.put("/:id", verifyToken, user.updateUserById);
router.delete("/id/:id", verifyToken, authorizeRoles("ADMIN"), user.deleteUserById);

module.exports = router;
const express = require("express");
const user = require("../controller/user.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/:userId/address", verifyToken, user.createAddress);
router.put("/address/:addressId", verifyToken, user.updateAddress);
router.delete("/address/:addressId", verifyToken, user.deleteAddress);

router.post("/", verifyToken, authorizeRoles("ADMIN"), user.addUser);
router.get("/", verifyToken, authorizeRoles("ADMIN"), user.getAllUser);
router.get("/id/:id", verifyToken, user.getUserById);
router.put("/:id", verifyToken, authorizeRoles("ADMIN"), user.updateUserById);
router.delete("/id/:id", verifyToken, authorizeRoles("ADMIN"), user.deleteUserById);

module.exports = router;
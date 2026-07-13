const express = require("express");
const user = require("../controller/user.controller");

const router = express.Router();

router.post("/:userId/address", user.createAddress);
router.put("/address/:addressId", user.updateAddress);
router.delete("/address/:addressId", user.deleteAddress);

router.post("/", user.addUser);
router.get("/", user.getAllUser);
router.get("/id/:id", user.getUserById);
router.put("/:id", user.updateUserById);
router.delete("/id/:id", user.deleteUserById);

module.exports = router;
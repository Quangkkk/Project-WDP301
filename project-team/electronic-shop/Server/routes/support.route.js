const express = require("express");
const support = require("../controller/support.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

router.post("/tickets", verifyToken, support.createTicket);
router.get("/tickets", verifyToken, support.getAllTickets);
router.get("/tickets/:id", verifyToken, support.getTicketById);
router.put(
  "/tickets/:id",
  verifyToken,
  authorizeRoles("ADMIN", "STAFF"),
  support.updateTicketById
);
router.delete(
  "/tickets/:id",
  verifyToken,
  authorizeRoles("ADMIN", "STAFF"),
  support.deleteTicketById
);
router.post(
  "/tickets/:ticketId/messages",
  verifyToken,
  authorizeRoles("ADMIN", "STAFF"),
  support.createTicketMessage
);

module.exports = router;
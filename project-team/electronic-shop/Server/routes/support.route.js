const express = require("express");
const support = require("../controller/support.controller");

const router = express.Router();

router.post("/tickets", support.createTicket);
router.get("/tickets", support.getAllTickets);
router.get("/tickets/:id", support.getTicketById);
router.put("/tickets/:id", support.updateTicketById);
router.delete("/tickets/:id", support.deleteTicketById);
router.post("/tickets/:ticketId/messages", support.createTicketMessage);

module.exports = router;
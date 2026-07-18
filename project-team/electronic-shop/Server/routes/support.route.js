const express = require("express");
const support = require("../Controller/support.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();
const allSupportRoles = authorizeRoles("CUSTOMER", "STAFF", "ADMIN", "MANAGER");
const staffRoles = authorizeRoles("STAFF", "ADMIN", "MANAGER");

router.use(verifyToken);

router.post("/tickets", authorizeRoles("CUSTOMER"), support.createTicket);
router.get("/tickets", allSupportRoles, support.getTickets);
router.get("/tickets/:id/messages", allSupportRoles, support.getTicketMessages);
router.get("/tickets/:id", allSupportRoles, support.getTicketMessages);
router.post("/tickets/:id/messages", allSupportRoles, support.createMessage);
router.put("/tickets/:id", allSupportRoles, support.updateTicket);
router.delete("/tickets/:id", allSupportRoles, support.deleteTicket);
router.patch(
  "/tickets/:id/close",
  authorizeRoles("CUSTOMER"),
  support.closeCustomerTicket
);

router.get("/admin/tickets", staffRoles, support.getAdminTickets);
router.patch("/admin/tickets/:id/assign", staffRoles, support.assignTicket);
router.patch(
  "/admin/tickets/:id/status",
  staffRoles,
  support.updateTicketStatus
);
router.post(
  "/admin/tickets/:id/messages",
  staffRoles,
  support.createAdminMessage
);

module.exports = router;

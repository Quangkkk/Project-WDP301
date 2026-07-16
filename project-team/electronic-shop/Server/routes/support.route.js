const express = require("express");
const support = require("../Controller/support.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// -------------------------------------------------------------
// CUSTOMER ROUTES (Chi danh cho Customer)
// -------------------------------------------------------------

// Customer tao ticket ho tro moi
router.post("/tickets", verifyToken, authorizeRoles("Customer"), support.createTicket);

// Customer xem danh sach ticket cua chinh minh
router.get("/tickets", verifyToken, authorizeRoles("Customer"), support.getCustomerTickets);

// Customer gui tin nhan phan hoi trong ticket
router.post("/tickets/:id/messages", verifyToken, authorizeRoles("Customer"), support.createCustomerMessage);

// Customer tu dong ticket ho tro
router.patch("/tickets/:id/close", verifyToken, authorizeRoles("Customer"), support.closeCustomerTicket);


// -------------------------------------------------------------
// SHARED ROUTES (Customer chu so huu hoac Staff duoc assign doc chi tiet)
// -------------------------------------------------------------

// Xem chi tiet ticket va toan bo tin nhan phan hoi
router.get("/tickets/:id/messages", verifyToken, authorizeRoles("Customer", "Admin", "Manager", "Staff"), support.getTicketMessages);


// -------------------------------------------------------------
// STAFF/MANAGER/ADMIN ROUTES (Nhan vien/Quan tri vien ho tro)
// -------------------------------------------------------------

// Xem toan bo tickets (co the loc theo status hoac assigned staff)
router.get("/admin/tickets", verifyToken, authorizeRoles("Admin", "Manager", "Staff"), support.getAdminTickets);

// Chi dinh nhan vien ho tro cho ticket
router.patch("/admin/tickets/:id/assign", verifyToken, authorizeRoles("Admin", "Manager", "Staff"), support.assignTicket);

// Cap nhat trang thai ticket (Open -> In Progress -> Closed)
router.patch("/admin/tickets/:id/status", verifyToken, authorizeRoles("Admin", "Manager", "Staff"), support.updateTicketStatus);

// Staff/Admin tra loi phan hoi tin nhan ticket
router.post("/admin/tickets/:id/messages", verifyToken, authorizeRoles("Admin", "Manager", "Staff"), support.createAdminMessage);

module.exports = router;
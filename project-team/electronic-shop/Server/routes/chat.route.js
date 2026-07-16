const express = require("express");
const chat = require("../Controller/chat.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();

// Customer tao cuoc hoi thoai voi 1 staff tu dong
router.post("/conversations", verifyToken, authorizeRoles("Customer"), chat.createConversation);

// Customer hoac Staff lay danh sach cac cuoc hoi thoai cua minh
router.get("/conversations", verifyToken, authorizeRoles("Customer", "Staff"), chat.getAllConversations);

// Lay lich su tin nhan cua cuoc hoi thoai (ho tro phan trang)
router.get("/conversations/:id/messages", verifyToken, authorizeRoles("Customer", "Staff"), chat.getMessagesByConversation);

// REST API gui tin nhan (fallback cho socket)
router.post("/conversations/:conversationId/messages", verifyToken, authorizeRoles("Customer", "Staff"), chat.createChatMessage);

module.exports = router;
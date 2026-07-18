const express = require("express");
const chat = require("../Controller/chat.controller");
const verifyToken = require("../middleware/verifyToken");
const authorizeRoles = require("../middleware/authorizeRoles");

const router = express.Router();
const chatRoles = authorizeRoles("CUSTOMER", "STAFF", "ADMIN", "MANAGER");
const staffRoles = authorizeRoles("STAFF", "ADMIN", "MANAGER");

router.use(verifyToken);

router.post("/uploads", chatRoles, chat.uploadChatFiles, chat.uploadChatAttachments);
router.post(
  "/conversations/open",
  authorizeRoles("CUSTOMER"),
  chat.getOrCreateConversation
);
router.post(
  "/conversations",
  authorizeRoles("CUSTOMER"),
  chat.createConversation
);
router.get("/conversations", chatRoles, chat.getConversations);
router.get(
  "/conversations/:id/messages",
  chatRoles,
  chat.getMessagesByConversation
);
router.get("/conversations/:id", chatRoles, chat.getConversationById);
router.put("/conversations/:id", staffRoles, chat.updateConversation);
router.post(
  "/conversations/:conversationId/messages",
  chatRoles,
  chat.sendMessage
);
router.patch(
  "/conversations/:conversationId/read",
  chatRoles,
  chat.markMessagesAsRead
);

module.exports = router;

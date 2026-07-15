const express = require("express");
const chat = require("../controller/chat.controller");

const router = express.Router();

router.post("/uploads", chat.uploadChatFiles, chat.uploadChatAttachments);

router.post("/conversations/open", chat.getOrCreateConversation);
router.post("/conversations", chat.createConversation);
router.get("/conversations", chat.getConversations);
router.get("/conversations/:id", chat.getConversationById);
router.put("/conversations/:id", chat.updateConversation);
router.post("/conversations/:conversationId/messages", chat.sendMessage);
router.patch("/conversations/:conversationId/read", chat.markMessagesAsRead);

module.exports = router;
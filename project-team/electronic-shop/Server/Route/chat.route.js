const express = require("express");
const chat = require("../Controller/chat.controller");

const router = express.Router();

router.post("/conversations", chat.createConversation);
router.get("/conversations", chat.getAllConversations);
router.get("/conversations/:id", chat.getConversationById);
router.put("/conversations/:id", chat.updateConversationById);
router.post("/conversations/:conversationId/messages", chat.createChatMessage);
router.patch("/messages/:messageId/read", chat.markMessageRead);

module.exports = router;
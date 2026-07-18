const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatService = require("../services/chat.service");

let io = null;

const roomNames = (conversationId) => [
  String(conversationId),
  `conversation:${conversationId}`,
];

const emitNewMessage = (conversationId, message) => {
  io.to(String(conversationId)).emit("receive_message", message);
  io.to(`conversation:${conversationId}`).emit("chat:newMessage", {
    conversationId: String(conversationId),
    message,
  });
};

const initChatSocket = (server, allowedOrigins = []) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const headerToken = socket.handshake.headers?.authorization;
    const token = socket.handshake.auth?.token || headerToken;

    if (!token) return next(new Error("Authentication error: Token is required"));

    const cleanToken = String(token).startsWith("Bearer ")
      ? String(token).slice(7)
      : String(token);

    try {
      const decoded = jwt.verify(
        cleanToken,
        process.env.JWT_SECRET || "dev_secret_key"
      );
      socket.user_id = decoded.user_id;
      socket.role = decoded.role;
      return next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const joinConversation = async (conversationId, callback) => {
      try {
        if (!conversationId) throw new Error("Conversation id is required");

        await chatService.assertConversationAccess(
          conversationId,
          socket.user_id,
          socket.role
        );

        for (const room of roomNames(conversationId)) socket.join(room);

        if (typeof callback === "function") callback({ success: true });
      } catch (error) {
        if (typeof callback === "function") {
          callback({ success: false, message: error.message });
        }
      }
    };

    const sendMessage = async (payload = {}, callback) => {
      try {
        const conversationId =
          payload.conversation_id || payload.conversationId || payload.id;

        const message = await chatService.saveMessage({
          conversationId,
          senderId: socket.user_id,
          role: socket.role,
          message: payload.message,
          attachments: payload.attachments || [],
        });

        emitNewMessage(conversationId, message);

        if (typeof callback === "function") {
          callback({ success: true, message: "Đã gửi tin nhắn.", data: message });
        }
      } catch (error) {
        if (typeof callback === "function") {
          callback({ success: false, message: error.message });
        }
      }
    };

    socket.on("join_conversation", (payload = {}, callback) =>
      joinConversation(payload.conversation_id || payload.conversationId, callback)
    );
    socket.on("chat:join", (payload, callback) =>
      joinConversation(
        typeof payload === "string"
          ? payload
          : payload?.conversation_id || payload?.conversationId,
        callback
      )
    );

    socket.on("send_message", sendMessage);
    socket.on("chat:sendMessage", sendMessage);

    socket.on("staff_typing", ({ conversation_id, is_typing } = {}) => {
      if (!conversation_id) return;
      socket.to(String(conversation_id)).emit("staff_typing", { is_typing });
      socket.to(`conversation:${conversation_id}`).emit("chat:typing", {
        conversationId: String(conversation_id),
        userId: socket.user_id,
        isTyping: Boolean(is_typing),
      });
    });

    socket.on("customer_typing", ({ conversation_id, is_typing } = {}) => {
      if (!conversation_id) return;
      socket.to(String(conversation_id)).emit("customer_typing", { is_typing });
    });

    socket.on("chat:typing", (payload = {}) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      if (!conversationId) return;

      socket.to(`conversation:${conversationId}`).emit("chat:typing", {
        conversationId: String(conversationId),
        userId: socket.user_id,
        isTyping: payload.isTyping ?? true,
      });
    });

    socket.on("chat:leave", (payload) => {
      const conversationId =
        typeof payload === "string"
          ? payload
          : payload?.conversation_id || payload?.conversationId;
      if (!conversationId) return;
      for (const room of roomNames(conversationId)) socket.leave(room);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.io is not initialized");
  return io;
};

module.exports = { initChatSocket, getIO };

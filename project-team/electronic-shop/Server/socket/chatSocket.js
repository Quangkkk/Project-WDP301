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
  io.to("staff_room").emit("staff_receive_message", {
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
      return next(new Error("Xác thực thất bại: token không hợp lệ"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}, role: ${socket.role}, user_id: ${socket.user_id}`);
    
    if (socket.user_id) {
      socket.join(`user_${socket.user_id}`);
      console.log(`Socket ${socket.id} joined personal room user_${socket.user_id}`);
    }

    const roleUpper = String(socket.role).toUpperCase();
    if (roleUpper === "ADMIN" || roleUpper === "STAFF" || roleUpper === "MANAGER") {
      socket.join("staff_room");
      console.log(`Socket ${socket.id} joined staff_room`);
    }

    const joinConversation = async (conversationId, callback) => {
      try {
        if (!conversationId) throw new Error("Thiếu mã cuộc trò chuyện");

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

    socket.on("chat:joinStaffRoom", async (callback) => {
      try {
        // If role is missing in token, fallback to DB check
        let hasAccess = false;
        if (["ADMIN", "STAFF", "MANAGER"].includes(String(socket.role).toUpperCase())) {
          hasAccess = true;
        } else if (socket.user_id) {
          const User = require("../models/User.model");
          const user = await User.findById(socket.user_id).populate("role_id");
          if (user && user.role_id && ["ADMIN", "STAFF", "MANAGER"].includes(String(user.role_id.code).toUpperCase())) {
            hasAccess = true;
            socket.role = user.role_id.code.toUpperCase(); // cache it
          }
        }
        
        if (hasAccess) {
          socket.join("staff_room");
          if (typeof callback === "function") callback({ success: true });
        } else {
          if (typeof callback === "function") callback({ success: false, message: "Unauthorized" });
        }
      } catch (error) {
        if (typeof callback === "function") callback({ success: false, message: error.message });
      }
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

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatService = require("../services/chat.service");

let io = null;

const initChatSocket = (server) => {
  // Khoi tao socket server ho tro CORS tu client port 5173 va cac nguon khac
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Middleware xac thuc Token khi ket noi
  io.use((socket, next) => {
    // Lay token tu handshake auth hoac header Authorization
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (!token) {
      return next(new Error("Authentication error: Token is required"));
    }

    const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

    try {
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || "dev_secret_key");
      socket.user = decoded;
      socket.user_id = decoded.user_id;
      socket.role = decoded.role;
      next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected to chat socket: ${socket.user_id} (${socket.role})`);

    // Customer hoac Staff tham gia vao phong chat theo conversationId
    socket.on("join_conversation", ({ conversation_id }) => {
      if (!conversation_id) return;
      socket.join(conversation_id);
      console.log(`User ${socket.user_id} joined room: ${conversation_id}`);
    });

    // Customer hoac Staff gui tin nhan real-time
    socket.on("send_message", async ({ conversation_id, message }) => {
      if (!conversation_id || !message) return;

      try {
        // Luu vao database qua service layer
        const chatMsg = await chatService.saveMessage({
          conversationId: conversation_id,
          senderId: socket.user_id,
          message,
        });

        // Phat lai tin nhan cho tat ca cac client dang join room conversation_id
        io.to(conversation_id).emit("receive_message", chatMsg);
      } catch (error) {
        console.error("Failed to process socket send_message:", error.message);
      }
    });

    // Staff dang nhap chuong trinh typing (dang go phim)
    socket.on("staff_typing", ({ conversation_id, is_typing }) => {
      if (!conversation_id) return;
      // Broadcast thong tin dang go phim den các user khac trong phong
      socket.to(conversation_id).emit("staff_typing", { is_typing });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from socket: ${socket.user_id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};

module.exports = {
  initChatSocket,
  getIO,
};

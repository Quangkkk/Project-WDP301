const express = require("express");
const http = require("http");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const { connectDB } = require("./models");
const routers = require("./routes");
const {
  initChatSocket,
} = require("./socket/chatSocket");

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://localhost:5173",
  "https://127.0.0.1:5173",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = initChatSocket(
  httpServer,
  allowedOrigins
);

app.set("io", io);

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    !origin ||
    allowedOrigins.includes(origin)
  ) {
    if (origin) {
      res.setHeader(
        "Access-Control-Allow-Origin",
        origin
      );
    }

    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Welcome to Electronic Shop API",
  });
});

app.use("/auth", routers.auth);
app.use("/user", routers.user);
app.use("/category", routers.category);
app.use("/brand", routers.brand);
app.use("/product", routers.product);
app.use("/cart", routers.cart);
app.use("/order", routers.order);
app.use("/review", routers.review);
app.use("/coupon", routers.coupon);

app.use(
  "/shipping-method",
  routers.shippingMethod
);

app.use("/role", routers.role);
app.use("/support", routers.support);
app.use("/chat", routers.chat);
app.use("/wishlist", routers.wishlist);
app.use("/payment", routers.payment);
app.use("/manager", routers.manager);

// 404
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = Number(
  process.env.PORT || 8080
);

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in Server/.env"
      );
    }

    // Phai ket noi database thanh cong
    // truoc khi mo cong server.
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );

      console.log(
        "Socket.IO chat is enabled"
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
};

startServer();
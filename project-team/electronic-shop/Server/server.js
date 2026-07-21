const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, ".env"),
});

const { connectDB } = require("./models");
const routers = require("./routes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://localhost:5173",
  "https://127.0.0.1:5173",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin || allowedOrigins.includes(origin)) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

connectDB();

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to Electronic Shop API",
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
app.use("/shipping-method", routers.shippingMethod);
app.use("/role", routers.role);
app.use("/support", routers.support);
app.use("/chat", routers.chat);
app.use("/wishlist", routers.wishlist);
app.use("/payment", routers.payment);
app.use("/analytics", routers.analytics);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { connectDB } = require("./Model/index.js");
const routers = require("./Route/index.js");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://localhost:5173",
  "https://127.0.0.1:5173",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Welcome to Electronic Shop API",
  });
});

app.use("/user", routers.user);
app.use("/category", routers.category);
app.use("/product", routers.product);
app.use("/product-detail", routers.productDetail);
app.use("/brand", routers.brand);
app.use("/payment", routers.payment);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
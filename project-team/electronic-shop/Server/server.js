const express = require("express");
const connectDB = require("./config/db");
const productRoutes = require("./Route/product.route");
const authRoutes = require("./Route/auth.route");
require("dotenv").config();

const app = express();

app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send({
    message: "Welcome to Electronic Shop API",
  });
});

app.use("/product", productRoutes);
app.use("/auth", authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
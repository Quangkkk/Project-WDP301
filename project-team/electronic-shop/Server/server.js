const express = require("express");
const connectDB = require("./config/db");
const productRoutes = require("./Route/product.route");

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
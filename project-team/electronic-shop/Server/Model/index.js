//connect db and create schema
const mongoose = require('mongoose');
const user = require('./User.model.js');
const product = require('./Product.model.js');
const productDetail = require('./ProductDetail.model.js');
const category = require('./Category.model.js');
const brand = require('./Brand.model.js');
const bill = require('./Bill.model.js');

const db = {};
db.user = user;
db.product = product;
db.productDetail = productDetail;
db.category = category;
db.brand = brand;
db.bill = bill;

db.connectDB = async () => {
  try {
    // Đặt cấu hình strictQuery trước khi kết nối
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGO_URI, {

    });

    console.log("Connected to MongoDB successfully");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
  }
};


module.exports = { ...db }
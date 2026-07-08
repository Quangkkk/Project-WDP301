const mongoose = require("mongoose");

const User = require("./User.model");
const Role = require("./Roles.model");
const UserAddress = require("./UserAddress.model");

const Category = require("./Category.model");
const Brand = require("./Brand.model");
const Product = require("./Product.model");
const ProductVariant = require("./ProductVariant.model");

const Cart = require("./Cart.model");
const CartItem = require("./CartItem.model");
const Wishlist = require("./Wishlist.model");

const ShippingMethod = require("./ShippingMethod.model");
const Order = require("./Orders.model");
const OrderItem = require("./OrderItem.model");

const Review = require("./Review.model");
const Coupon = require("./Coupon.model");
const CouponUsage = require("./CouponUsage.model");

const ChatConversation = require("./ChatConversation.model");
const ChatMessage = require("./ChatMessage.model");
const SupportTicket = require("./SupportTicket.model");
const TicketMessage = require("./TicketMessage.model");

const db = {
  mongoose,
  User,
  Role,
  UserAddress,
  Category,
  Brand,
  Product,
  ProductVariant,
  Cart,
  CartItem,
  Wishlist,
  ShippingMethod,
  Order,
  OrderItem,
  Review,
  Coupon,
  CouponUsage,
  ChatConversation,
  ChatMessage,
  SupportTicket,
  TicketMessage,
};

db.connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = db;
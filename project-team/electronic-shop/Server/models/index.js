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
const PaymentTransaction = require("./PaymentTransaction.model");

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
  PaymentTransaction,

  Review,
  Coupon,
  CouponUsage,

  ChatConversation,
  ChatMessage,
  SupportTicket,
  TicketMessage,
};

db.connectDB = async () => {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: Number(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000
      ),
    });

    console.log("Connected to MongoDB successfully");
    return mongoose.connection;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    throw error;
  }
};

module.exports = db;
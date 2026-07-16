const request = require("supertest");
const mongoose = require("mongoose");
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const Role = require("../models/Roles.model");
const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");
const Cart = require("../models/Cart.model");
const CartItem = require("../models/CartItem.model");
const Order = require("../models/Orders.model");
const OrderItem = require("../models/OrderItem.model");
const Coupon = require("../models/Coupon.model");
const CouponUsage = require("../models/CouponUsage.model");

// Mock nodemailer to prevent real emails being sent during tests
jest.mock("../mailtrap/nodemailer", () => {
  return jest.fn().mockImplementation(() => Promise.resolve({ messageId: "mock-id" }));
});

// Import express routes and bootstrap app for testing
const app = express();
app.use(express.json());

const authRoutes = require("../routes/auth.route");
const cartRoutes = require("../routes/cart.route");
const orderRoutes = require("../routes/order.route");
const couponRoutes = require("../routes/coupon.route");

app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/coupons", couponRoutes);

describe("E-commerce API Integration Tests", () => {
  let dbConnection;
  let testUser;
  let testRole;
  let testProduct;
  let testVariant;
  let testCoupon;
  let userToken;

  beforeAll(async () => {
    // Ket noi vao database test
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/electronic_shop_test";
    dbConnection = await mongoose.connect(mongoUri);

    // Don dep du lieu cu
    await User.deleteMany({});
    await Role.deleteMany({});
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});
    await Cart.deleteMany({});
    await CartItem.deleteMany({});
    await Order.deleteMany({});
    await OrderItem.deleteMany({});
    await Coupon.deleteMany({});
    await CouponUsage.deleteMany({});

    // Tao role mac dinh
    testRole = await Role.create({
      code: "CUSTOMER",
      name: "Customer",
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // 1. Test dang ky & dang nhap & verify OTP
  test("Should register a new user with unverified status and generate OTP", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        name: "Test Customer",
        email: "testcustomer@example.com",
        password: "password123",
        phone: "0900000001",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("unverified");

    // Lay user trong DB de doc OTP code
    testUser = await User.findOne({ email: "testcustomer@example.com" });
    expect(testUser.email_otp).toBeDefined();
  });

  test("Should fail login if user status is unverified", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "testcustomer@example.com",
        password: "password123",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test("Should verify user email with correct OTP", async () => {
    const res = await request(app)
      .post("/auth/verify-email")
      .send({
        email: testUser.email,
        otp: testUser.email_otp,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("active");
  });

  test("Should login successfully after email verification", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "testcustomer@example.com",
        password: "password123",
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    userToken = res.body.token;
  });

  // 2. Test Them vao gio hang va kiem tra ton kho
  test("Should add product to cart matching variant stock quantity limits", async () => {
    // Tao san pham va variant demo voi ton kho stock_quantity = 5
    testProduct = await Product.create({
      name: "Smart Laptop Pro",
      sku: "LAP-PRO-001",
    });

    testVariant = await ProductVariant.create({
      product_id: testProduct._id,
      sku: "LAP-PRO-001-SLV",
      price: 1500,
      sale_price: 1400,
      stock_quantity: 5,
      variant_value: "Silver - 16GB RAM",
    });

    // Test add 2 san pham (hop le vi <= 5)
    const resAddOk = await request(app)
      .post("/cart")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        product_id: testProduct._id,
        variant_id: testVariant._id,
        quantity: 2,
      });

    expect(resAddOk.statusCode).toBe(200);
    expect(resAddOk.body.success).toBe(true);

    // Test add them 10 san pham (vuot qua ton kho hien tai la 5)
    const resAddFail = await request(app)
      .post("/cart")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        product_id: testProduct._id,
        variant_id: testVariant._id,
        quantity: 10,
      });

    expect(resAddFail.statusCode).toBe(400);
    expect(resAddFail.body.success).toBe(false);
  });

  // 3. Test Coupon validation
  test("Should apply discount coupon correctly within limits and expiration rules", async () => {
    // Tao coupon giảm gia
    testCoupon = await Coupon.create({
      code: "DISCOUNT100",
      discount_type: "fixed",
      discount_value: 100,
      min_order_value: 500,
      usage_limit: 10,
      user_usage_limit: 1,
      start_date: new Date(Date.now() - 1 * 60 * 60 * 1000), // Bat dau truoc do 1 gio
      end_date: new Date(Date.now() + 24 * 60 * 60 * 1000),  // Con han su dung 1 ngay
      is_active: true,
    });

    // Validate coupon qua route/service
    const resValidate = await request(app)
      .post("/coupons/validate")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        code: "DISCOUNT100",
        order_amount: 1400,
      });

    expect(resValidate.statusCode).toBe(200);
    expect(resValidate.body.success).toBe(true);
    expect(resValidate.body.data.discount_amount).toBe(100);
  });

  // 4. Test Đặt hang & Tru ton kho
  test("Should create an order, reduce variant stock level, and clear cart", async () => {
    // Lay gio hang hien tai de lay cart_id
    const cartRes = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${userToken}`);

    const cartId = cartRes.body.data._id;

    const resOrder = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        cart_id: cartId,
        receiver_name: "Test Receiver",
        receiver_phone: "0900000002",
        address_province: "Hanoi",
        address_district: "Hoan Kiem",
        address_ward: "Hang Trong",
        address_address_line: "123 Hang Khay",
        payment_method: "cod",
        coupon_code: "DISCOUNT100",
      });

    expect(resOrder.statusCode).toBe(201);
    expect(resOrder.body.success).toBe(true);

    // Kiem tra giam ton kho (Tu 5 xuong 3 vi đã dat mua 2 laptop)
    const updatedVariant = await ProductVariant.findById(testVariant._id);
    expect(updatedVariant.stock_quantity).toBe(3);

    // Kiem tra gio hang da duoc clear rong
    const cartCheck = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${userToken}`);
    expect(cartCheck.body.data.items.length).toBe(0);
  });
});

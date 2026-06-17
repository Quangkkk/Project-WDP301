const mongoose = require("mongoose");

const Review = require("../models/Review.model");
const Product = require("../models/Product.model");
const Order = require("../models/Orders.model");
const OrderItem = require("../models/OrderItem.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product_id: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: "$product_id", average_rating: { $avg: "$rating" }, rating_count: { $sum: 1 } } },
  ]);

  if (stats.length === 0) {
    await Product.findByIdAndUpdate(productId, { average_rating: 0, rating_count: 0 });
    return;
  }

  await Product.findByIdAndUpdate(productId, {
    average_rating: Number(stats[0].average_rating.toFixed(1)),
    rating_count: stats[0].rating_count,
  });
};

const createReview = async (req, res) => {
  try {
    const { user_id, order_id, product_id, rating, reviews, comment } = req.body;

    if (!user_id || !order_id || !product_id || rating === undefined) {
      return res.status(400).json({ success: false, message: "user_id, order_id, product_id and rating are required" });
    }

    if (![user_id, order_id, product_id].every(isValidObjectId)) {
      return res.status(400).json({ success: false, message: "Invalid user_id, order_id or product_id" });
    }

    const order = await Order.findById(order_id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (String(order.user_id) !== String(user_id)) {
      return res.status(400).json({ success: false, message: "Order does not belong to this user" });
    }

    const orderItem = await OrderItem.findOne({ order_id, product_id });
    if (!orderItem) return res.status(400).json({ success: false, message: "This product is not in the order" });

    const data = await Review.create({ user_id, order_id, product_id, rating, reviews: reviews || comment || null });
    await updateProductRating(product_id);

    return res.status(201).json({ success: true, message: "Create review successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create review", error: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const { product_id, user_id, order_id } = req.query;
    const filter = {};
    if (product_id) filter.product_id = product_id;
    if (user_id) filter.user_id = user_id;
    if (order_id) filter.order_id = order_id;

    const data = await Review.find(filter)
      .populate("user_id", "name email img_url")
      .populate("product_id", "name sku images")
      .populate("order_id", "status createdAt")
      .select("-__v")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get reviews", error: error.message });
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid review id" });
    const data = await Review.findById(id).populate("user_id", "name email img_url").populate("product_id", "name sku images").select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Review not found" });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get review", error: error.message });
  }
};

const updateReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const updateData = {};
    if (req.body.rating !== undefined) updateData.rating = req.body.rating;
    if (req.body.reviews !== undefined || req.body.comment !== undefined) updateData.reviews = req.body.reviews || req.body.comment;

    const data = await Review.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Review not found" });
    await updateProductRating(data.product_id);

    return res.status(200).json({ success: true, message: "Update review successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update review", error: error.message });
  }
};

const deleteReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const data = await Review.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Review not found" });
    await updateProductRating(data.product_id);

    return res.status(200).json({ success: true, message: "Delete review successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete review", error: error.message });
  }
};

module.exports = { createReview, getAllReviews, getReviewById, updateReviewById, deleteReviewById };
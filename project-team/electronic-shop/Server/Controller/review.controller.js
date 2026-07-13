const mongoose = require("mongoose");

const Review = require("../models/Review.model");
const Product = require("../models/Product.model");
const Order = require("../models/Orders.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeImages = (images) => {
  if (images === undefined || images === null) return [];
  if (Array.isArray(images)) return images;
  return [images];
};

const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product_id: new mongoose.Types.ObjectId(productId), status: { $ne: "hidden" } } },
    { $group: { _id: "$product_id", average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const data = stats[0] || { average: 0, count: 0 };
  await Product.findByIdAndUpdate(productId, {
    average_rating: Number((data.average || 0).toFixed(1)),
    rating_count: data.count || 0,
    total_review: data.count || 0,
  });
};

const createReview = async (req, res) => {
  try {
    const { user_id, order_id, product_id, rating, comment, reviews, images, status } = req.body;

    if (!user_id || !order_id || !product_id || rating === undefined) {
      return res.status(400).json({ success: false, message: "user_id, order_id, product_id and rating are required" });
    }

    if (![user_id, order_id, product_id].every(isValidObjectId)) {
      return res.status(400).json({ success: false, message: "Invalid user_id/order_id/product_id" });
    }

    const order = await Order.findById(order_id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const existed = await Review.findOne({ user_id, order_id, product_id });
    if (existed) return res.status(409).json({ success: false, message: "Review already exists" });

    const data = await Review.create({
      user_id,
      order_id,
      product_id,
      rating,
      comment: comment || reviews || null,
      images: normalizeImages(images),
      status: status || "visible",
    });

    await updateProductRating(product_id);
    return res.status(201).json({ success: true, message: "Create review successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create review", error: error.message });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const { product_id, user_id, order_id, status } = req.query;
    const filter = {};
    if (product_id) filter.product_id = product_id;
    if (user_id) filter.user_id = user_id;
    if (order_id) filter.order_id = order_id;
    if (status) filter.status = status;

    const data = await Review.find(filter)
      .populate("user_id", "name email img_url")
      .populate("product_id", "name sku")
      .populate("order_id", "payment_status created_at")
      .select("-__v")
      .sort({ created_at: -1 });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get reviews", error: error.message });
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid review id" });

    const data = await Review.findById(id)
      .populate("user_id", "name email img_url")
      .populate("product_id", "name sku")
      .populate("order_id", "payment_status created_at")
      .select("-__v");

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
    if (req.body.comment !== undefined || req.body.reviews !== undefined) updateData.comment = req.body.comment || req.body.reviews;
    if (req.body.images !== undefined) updateData.images = normalizeImages(req.body.images);
    if (req.body.status !== undefined) updateData.status = req.body.status;

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

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

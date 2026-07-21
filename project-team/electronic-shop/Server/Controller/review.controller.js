const mongoose = require("mongoose");
const reviewService = require("../services/review.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller tao review moi
const createReview = async (req, res) => {
  try {
    const userId = req.user_id; // Lay tu token duoc verify
    const { order_id, product_id, rating, comment, images } = req.body;

    if (!order_id || !product_id || rating === undefined) {
      return res.status(400).json({ success: false, message: "order_id, product_id and rating are required" });
    }

    if (!isValidObjectId(userId) || !isValidObjectId(order_id) || !isValidObjectId(product_id)) {
      return res.status(400).json({ success: false, message: "Invalid order_id or product_id" });
    }

    const data = await reviewService.createReview({
      user_id: userId,
      order_id,
      product_id,
      rating,
      comment,
      images,
    });

    return res.status(201).json({
      success: true,
      message: "Create review successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (
      error.message.includes("completed") ||
      error.message.includes("trong don hang") ||
      error.message.includes("da danh gia") ||
      error.message.includes("Rating must be")
    ) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to create review",
      error: error.message,
    });
  }
};

// Controller lay danh sach review cong khai cua san pham
const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params; // Product ID
    const { page, limit } = req.query;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Valid product ID is required" });
    }

    const result = await reviewService.getProductReviews(id, { page, limit });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get reviews",
      error: error.message,
    });
  }
};


// Lay review cua customer dang dang nhap.
// Frontend dung API nay de chi hien nut "Danh gia" cho san pham chua duoc review.
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user_id;
    const { order_id } = req.query;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    if (order_id && !isValidObjectId(order_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order_id",
      });
    }

    const data = await reviewService.getMyReviews(userId, {
      order_id,
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get your reviews",
      error: error.message,
    });
  }
};

// Controller sua review ca nhan cua Customer
const updateReview = async (req, res) => {
  try {
    const { id } = req.params; // Review ID
    const userId = req.user_id;
    const { rating, comment, images } = req.body;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    const data = await reviewService.updateReview(id, userId, { rating, comment, images });
    return res.status(200).json({
      success: true,
      message: "Update review successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Review not found") {
      statusCode = 404;
    } else if (error.message.includes("khong co quyen") || error.message.includes("Rating must be")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update review",
      error: error.message,
    });
  }
};

// Controller xoa review
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID",
      });
    }

    const data = await reviewService.deleteReview(id, {
      user_id: req.user_id,
      role: req.role,
    });

    return res.status(200).json({
      success: true,
      message: "Delete review successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;

    if (error.message === "Review not found") {
      statusCode = 404;
    } else if (error.message === "Access denied") {
      statusCode = 403;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to delete review",
      error: error.message,
    });
  }
};

// Controller an review vi pham (chi danh cho Admin/Manager/Staff)
const hideReview = async (req, res) => {
  try {
    const { id } = req.params; // Review ID
    const { hidden_reason } = req.body;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid review ID" });
    }

    const data = await reviewService.hideReview(id, { hidden_reason });
    return res.status(200).json({
      success: true,
      message: "Hide review successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Review not found") {
      statusCode = 404;
    } else if (error.message.includes("hidden_reason")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to hide review",
      error: error.message,
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  hideReview,
};
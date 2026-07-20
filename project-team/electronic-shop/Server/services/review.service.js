const mongoose = require("mongoose");
const Review = require("../models/Review.model");
const Product = require("../models/Product.model");
const Order = require("../models/Orders.model");
const OrderItem = require("../models/OrderItem.model");

// Ham cap nhat lai average_rating, rating_count, total_review cho Product
const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        product_id: new mongoose.Types.ObjectId(productId),
        status: { $ne: "hidden" },
      },
    },
    {
      $group: {
        _id: "$product_id",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const data = stats[0] || { average: 0, count: 0 };
  await Product.findByIdAndUpdate(productId, {
    average_rating: Number((data.average || 0).toFixed(1)),
    rating_count: data.count || 0,
    total_review: data.count || 0,
  });
};

// Chuan hoa anh sang dang mang
const normalizeImages = (images) => {
  if (images === undefined || images === null) return [];
  if (Array.isArray(images)) return images.filter(Boolean);
  return [images].filter(Boolean);
};

// Tao review moi
const createReview = async ({ user_id, order_id, product_id, rating, comment, images }) => {
  // 1. Validate rating
  const ratingNum = Number(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  // 2. Kiem tra xem don hang co ton tai, co phai cua user va da completed chua
  const order = await Order.findOne({
    _id: order_id,
    user_id,
    status: "completed",
  });

  if (!order) {
    throw new Error("Ban chi duoc danh gia san pham tu don hang da hoan thanh (completed)");
  }

  // 3. Kiem tra xem san pham co nam trong don hang do khong
  const hasProduct = await OrderItem.exists({
    order_id,
    product_id,
  });

  if (!hasProduct) {
    throw new Error("San pham khong co trong don hang nay");
  }

  // 4. Kiem tra xem da tung danh gia san pham nay trong don hang nay chua
  const existed = await Review.findOne({
    user_id,
    order_id,
    product_id,
  });

  if (existed) {
    throw new Error("Ban da danh gia san pham nay trong don hang nay roi");
  }

  // 5. Tao review
  const review = await Review.create({
    user_id,
    order_id,
    product_id,
    rating: ratingNum,
    comment: comment || null,
    images: normalizeImages(images),
    status: "visible",
  });

  // 6. Cap nhat xep hang san pham
  await updateProductRating(product_id);

  return review;
};

// Lay danh sach reviews cong khai cua mot san pham kem phan trang va rating trung binh
const getProductReviews = async (productId, { page = 1, limit = 10 }) => {
  const pageNum = Math.max(Number(page || 1), 1);
  const limitNum = Math.min(
    Math.max(Number(limit || 10), 1),
    50
  );
  const skip = (pageNum - 1) * limitNum;

  // Lay reviews public
  const filter = {
    product_id: productId,
    status: "visible",
  };

  const [reviews, totalCount] = await Promise.all([
    Review.find(filter)
      .populate("user_id", "name email img_url")
      .select("-__v")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Review.countDocuments(filter),
  ]);

  // Tinh toan average rating hien tai tu database cho san pham nay
  const stats = await Review.aggregate([
    { $match: { product_id: new mongoose.Types.ObjectId(productId), status: "visible" } },
    { $group: { _id: "$product_id", average: { $avg: "$rating" } } },
  ]);

  const averageRating = stats[0] ? Number((stats[0].average || 0).toFixed(1)) : 0;

  return {
    reviews,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalCount / limitNum),
    },
    stats: {
      average_rating: averageRating,
      total_review: totalCount,
    },
  };
};

// Chinh sua review (chi cho phep nguoi viet review sua)
const updateReview = async (reviewId, userId, { rating, comment, images }) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new Error("Review not found");
  }

  // Kiem tra quyen so huu
  if (String(review.user_id) !== String(userId)) {
    throw new Error("Ban khong co quyen sua review cua nguoi khac");
  }

  // Cap nhat cac truong neu truyen vao
  if (rating !== undefined) {
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    review.rating = ratingNum;
  }

  if (comment !== undefined) {
    review.comment = comment;
  }

  if (images !== undefined) {
    review.images = normalizeImages(images);
  }

  await review.save();

  // Tinh toan lai rating san pham
  await updateProductRating(review.product_id);

  return review;
};

// An review (danh cho Admin/Manager/Staff)
const hideReview = async (reviewId, { hidden_reason }) => {
  if (!hidden_reason || !hidden_reason.trim()) {
    throw new Error("Ly do an review (hidden_reason) la bat buoc");
  }

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new Error("Review not found");
  }

  review.status = "hidden";
  review.hidden_reason = hidden_reason.trim();
  await review.save();

  // Tinh toan lai rating san pham
  await updateProductRating(review.product_id);

  return review;
};

// Xoa review. Customer chi duoc xoa review cua minh; backoffice duoc xoa review vi pham.
const deleteReview = async (reviewId, currentUser) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new Error("Review not found");
  }

  const role = String(currentUser?.role || "").toUpperCase();
  const isOwner = String(review.user_id) === String(currentUser?.user_id || "");
  const isBackOffice = ["ADMIN", "MANAGER", "STAFF"].includes(role);

  if (!isOwner && !isBackOffice) {
    throw new Error("Access denied");
  }

  const productId = review.product_id;
  await review.deleteOne();
  await updateProductRating(productId);

  return review;
};

module.exports = {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
  hideReview,
};
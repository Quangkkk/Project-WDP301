const mongoose = require("mongoose");
const wishlistService = require("../services/wishlist.service");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller lay wishlist cua Customer dang dang nhap
const getSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized or invalid user token" });
    }

    const data = await wishlistService.getWishlistByUser(userId);
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get user wishlist",
      error: error.message,
    });
  }
};

// Controller them san pham vao wishlist cho Customer dang dang nhap
const addSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ success: false, message: "product_id is required" });
    }

    if (!isValidObjectId(userId) || !isValidObjectId(product_id)) {
      return res.status(400).json({ success: false, message: "Invalid user_id or product_id" });
    }

    const result = await wishlistService.addToWishlist({ user_id: userId, product_id });
    const statusCode = result.message.includes("already") ? 200 : 201;

    return res.status(statusCode).json({
      success: true,
      ...result,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "User not found" || error.message === "Product not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: "Failed to add product to wishlist",
      error: error.message,
    });
  }
};

// Controller xoa san pham khoi wishlist theo productId cho Customer dang dang nhap
const deleteSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    if (!isValidObjectId(userId) || !isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid user_id or product_id" });
    }

    const data = await wishlistService.deleteWishlistByUserAndProduct(userId, productId);
    return res.status(200).json({
      success: true,
      message: "Remove product from wishlist successfully",
      data,
    });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Wishlist item not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({
      success: false,
      message: "Failed to remove product from wishlist",
      error: error.message,
    });
  }
};

// Giu nguyen cac controller cu cho Admin (hoac tuong thich cu neu can)
const getAllWishlists = async (req, res) => {
  try {
    const { user_id, product_id } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (product_id) filter.product_id = product_id;

    const data = await wishlistService.getAllWishlists(filter);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get wishlists", error: error.message });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const userId = req.user_id || req.body.user_id;
    const { product_id } = req.body;
    const result = await wishlistService.toggleWishlist({ user_id: userId, product_id });
    const statusCode = result.action === "added" ? 201 : 200;
    return res.status(statusCode).json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to toggle wishlist", error: error.message });
  }
};

module.exports = {
  getSelfWishlist,
  addSelfWishlist,
  deleteSelfWishlist,
  getAllWishlists,
  toggleWishlist,
};
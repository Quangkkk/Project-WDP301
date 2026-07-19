const mongoose = require("mongoose");
const wishlistService = require("../services/wishlist.service");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || ""));

// Dem tong so luot yeu thich cua mot san pham (public)
const getProductWishlistCount = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product_id",
      });
    }

    const count = await wishlistService.countProductWishlist(productId);

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    const statusCode = error.message === "Product not found" ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to count product wishlist",
      error: error.message,
    });
  }
};

// Lay wishlist cua customer dang dang nhap
const getSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;

    if (!isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized or invalid user token",
      });
    }

    const data = await wishlistService.getWishlistByUser(userId);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    const statusCode =
      error.message === "User not found" ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "Failed to get user wishlist",
      error: error.message,
    });
  }
};

// Kiem tra san pham co trong wishlist hay khong
const checkSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;

    const productId =
      req.query.product_id ||
      req.query.productId ||
      req.query.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "product_id is required",
      });
    }

    if (
      !isValidObjectId(userId) ||
      !isValidObjectId(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const result =
      await wishlistService.checkWishlist({
        user_id: userId,
        product_id: productId,
      });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to check wishlist",
      error: error.message,
    });
  }
};

// Them san pham vao wishlist
const addSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;
    const { product_id: productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "product_id is required",
      });
    }

    if (
      !isValidObjectId(userId) ||
      !isValidObjectId(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const result =
      await wishlistService.addToWishlist({
        user_id: userId,
        product_id: productId,
      });

    const statusCode =
      result.message.includes("already")
        ? 200
        : 201;

    return res.status(statusCode).json({
      success: true,
      ...result,
    });
  } catch (error) {
    const statusCode = [
      "User not found",
      "Product not found",
    ].includes(error.message)
      ? 404
      : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "Failed to add product to wishlist",
      error: error.message,
    });
  }
};

// Them neu chua co, xoa neu da co
const toggleSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;
    const { product_id: productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "product_id is required",
      });
    }

    if (
      !isValidObjectId(userId) ||
      !isValidObjectId(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const result =
      await wishlistService.toggleWishlist({
        user_id: userId,
        product_id: productId,
      });

    return res
      .status(result.action === "added" ? 201 : 200)
      .json({
        success: true,
        ...result,
      });
  } catch (error) {
    const statusCode = [
      "User not found",
      "Product not found",
    ].includes(error.message)
      ? 404
      : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "Failed to toggle wishlist",
      error: error.message,
    });
  }
};

// Xoa bang wishlist document ID hoac product ID
const deleteSelfWishlist = async (req, res) => {
  try {
    const userId = req.user_id;
    const { identifier } = req.params;

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message:
          "Wishlist id or product id is required",
      });
    }

    if (
      !isValidObjectId(userId) ||
      !isValidObjectId(identifier)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid wishlist id or product id",
      });
    }

    const data =
      await wishlistService.deleteWishlistByIdentifier(
        userId,
        identifier
      );

    return res.status(200).json({
      success: true,
      message:
        "Remove product from wishlist successfully",
      data,
    });
  } catch (error) {
    const statusCode =
      error.message === "Wishlist item not found"
        ? 404
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "Failed to remove product from wishlist",
      error: error.message,
    });
  }
};

// Route tuong thich voi frontend cu
const deleteSelfWishlistByUserAndProduct = async (
  req,
  res
) => {
  try {
    const tokenUserId = String(req.user_id || "");
    const { userId, productId } = req.params;

    if (tokenUserId !== String(userId || "")) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (
      !isValidObjectId(tokenUserId) ||
      !isValidObjectId(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const data =
      await wishlistService.deleteWishlistByUserAndProduct(
        tokenUserId,
        productId
      );

    return res.status(200).json({
      success: true,
      message:
        "Remove product from wishlist successfully",
      data,
    });
  } catch (error) {
    const statusCode =
      error.message === "Wishlist item not found"
        ? 404
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        error.message ||
        "Failed to remove product from wishlist",
      error: error.message,
    });
  }
};

// Giu lai de tuong thich voi code admin cu
const getAllWishlists = async (req, res) => {
  try {
    const { user_id, product_id } = req.query;
    const filter = {};

    if (user_id) {
      filter.user_id = user_id;
    }

    if (product_id) {
      filter.product_id = product_id;
    }

    const data =
      await wishlistService.getAllWishlists(filter);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get wishlists",
      error: error.message,
    });
  }
};

const toggleWishlist = toggleSelfWishlist;

module.exports = {
  getProductWishlistCount,
  getSelfWishlist,
  checkSelfWishlist,
  addSelfWishlist,
  toggleSelfWishlist,
  deleteSelfWishlist,
  deleteSelfWishlistByUserAndProduct,
  getAllWishlists,
  toggleWishlist,
};
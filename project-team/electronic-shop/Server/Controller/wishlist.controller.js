const mongoose = require("mongoose");

const Wishlist = require("../models/Wishlist.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateWishlist = (query) => {
  return query
    .populate("user_id", "name email phone img_url")
    .populate({
      path: "product_id",
      select:
        "name sku description average_rating rating_count status is_featured brand_id category_id",
      populate: [
        {
          path: "brand_id",
          select: "name logo_img status",
        },
        {
          path: "category_id",
          select: "name status",
        },
      ],
    })
    .select("-__v");
};

const getAllWishlists = async (req, res) => {
  try {
    const { user_id, product_id } = req.query;

    const filter = {};

    if (user_id) {
      if (!isValidObjectId(user_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user_id",
        });
      }

      filter.user_id = user_id;
    }

    if (product_id) {
      if (!isValidObjectId(product_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product_id",
        });
      }

      filter.product_id = product_id;
    }

    const data = await populateWishlist(Wishlist.find(filter)).sort({
      created_at: -1,
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get wishlists",
      error: error.message,
    });
  }
};

const getWishlistById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wishlist id",
      });
    }

    const data = await populateWishlist(Wishlist.findById(id));

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get wishlist item",
      error: error.message,
    });
  }
};

const getWishlistByUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.user_id;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid user_id is required",
      });
    }

    const data = await populateWishlist(
      Wishlist.find({
        user_id: userId,
      })
    ).sort({
      created_at: -1,
    });

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

const checkWishlist = async (req, res) => {
  try {
    const { user_id, product_id } = req.query;

    if (!user_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and product_id are required",
      });
    }

    if (!isValidObjectId(user_id) || !isValidObjectId(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const data = await Wishlist.findOne({
      user_id,
      product_id,
    }).select("-__v");

    return res.status(200).json({
      success: true,
      exists: Boolean(data),
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check wishlist",
      error: error.message,
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and product_id are required",
      });
    }

    if (!isValidObjectId(user_id) || !isValidObjectId(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existed = await Wishlist.findOne({
      user_id,
      product_id,
    });

    if (existed) {
      const data = await populateWishlist(Wishlist.findById(existed._id));

      return res.status(200).json({
        success: true,
        message: "Product already exists in wishlist",
        data,
      });
    }

    const created = await Wishlist.create({
      user_id,
      product_id,
    });

    const data = await populateWishlist(Wishlist.findById(created._id));

    return res.status(201).json({
      success: true,
      message: "Add product to wishlist successfully",
      data,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product already exists in wishlist",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
      error: error.message,
    });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const { user_id, product_id } = req.body;

    if (!user_id || !product_id) {
      return res.status(400).json({
        success: false,
        message: "user_id and product_id are required",
      });
    }

    if (!isValidObjectId(user_id) || !isValidObjectId(product_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const existed = await Wishlist.findOne({
      user_id,
      product_id,
    });

    if (existed) {
      await Wishlist.findByIdAndDelete(existed._id);

      return res.status(200).json({
        success: true,
        message: "Remove product from wishlist successfully",
        action: "removed",
        data: existed,
      });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const product = await Product.findById(product_id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const created = await Wishlist.create({
      user_id,
      product_id,
    });

    const data = await populateWishlist(Wishlist.findById(created._id));

    return res.status(201).json({
      success: true,
      message: "Add product to wishlist successfully",
      action: "added",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to toggle wishlist",
      error: error.message,
    });
  }
};

const deleteWishlistById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wishlist id",
      });
    }

    const data = await Wishlist.findByIdAndDelete(id).select("-__v");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delete wishlist item successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete wishlist item",
      error: error.message,
    });
  }
};

const deleteWishlistByUserAndProduct = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.user_id;
    const productId = req.params.productId || req.body.product_id;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "user_id and product_id are required",
      });
    }

    if (!isValidObjectId(userId) || !isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }

    const data = await Wishlist.findOneAndDelete({
      user_id: userId,
      product_id: productId,
    }).select("-__v");

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Wishlist item not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Remove product from wishlist successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove product from wishlist",
      error: error.message,
    });
  }
};

module.exports = {
  getAllWishlists,
  getWishlistById,
  getWishlistByUser,
  checkWishlist,
  addToWishlist,
  toggleWishlist,
  deleteWishlistById,
  deleteWishlistByUserAndProduct,
};
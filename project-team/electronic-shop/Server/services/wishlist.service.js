const Wishlist = require("../models/Wishlist.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");
const ProductVariant = require("../models/ProductVariant.model");

const populateWishlist = (query) => {
  return query
    .populate("user_id", "name email phone img_url")
    .populate({
      path: "product_id",
      select: "name sku description average_rating rating_count status is_featured brand_id category_id",
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

// Ham bo tro lay gia thap nhat va anh tu product variants
const enrichWishlistItem = async (item) => {
  if (!item || !item.product_id) return item;

  const itemObj = item.toObject ? item.toObject() : item;
  const product = itemObj.product_id;

  if (product && product._id) {
    const variants = await ProductVariant.find({
      product_id: product._id,
      is_active: true,
    }).lean();

    let lowestPrice = 0;
    let variantImage = null;

    if (variants.length > 0) {
      const prices = variants.map((v) => (v.sale_price > 0 ? v.sale_price : v.price));
      lowestPrice = Math.min(...prices);

      const firstWithImage = variants.find((v) => v.image);
      if (firstWithImage) {
        variantImage = firstWithImage.image;
      }
    }

    product.lowest_price = lowestPrice;
    product.image = variantImage || product.image || null;
  }

  return itemObj;
};

// Lay tat ca wishlist theo bo loc
const getAllWishlists = async (filter) => {
  if (filter.user_id) {
    const userExists = await User.exists({ _id: filter.user_id });
    if (!userExists) throw new Error("User not found");
  }
  if (filter.product_id) {
    const productExists = await Product.exists({ _id: filter.product_id });
    if (!productExists) throw new Error("Product not found");
  }

  const items = await populateWishlist(Wishlist.find(filter)).sort({ created_at: -1 });
  return await Promise.all(items.map(enrichWishlistItem));
};

// Lay wishlist theo ID
const getWishlistById = async (id) => {
  const data = await populateWishlist(Wishlist.findById(id));
  if (!data) {
    throw new Error("Wishlist item not found");
  }
  return await enrichWishlistItem(data);
};

// Lay wishlist theo User ID
const getWishlistByUser = async (userId) => {
  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    throw new Error("User not found");
  }
  const items = await populateWishlist(Wishlist.find({ user_id: userId })).sort({ created_at: -1 });
  return await Promise.all(items.map(enrichWishlistItem));
};

// Kiem tra item da co trong wishlist chua
const checkWishlist = async ({ user_id, product_id }) => {
  const data = await Wishlist.findOne({ user_id, product_id }).select("-__v");
  return {
    exists: Boolean(data),
    data,
  };
};

// Them item vao wishlist
const addToWishlist = async ({ user_id, product_id }) => {
  const user = await User.findById(user_id);
  if (!user) throw new Error("User not found");

  const product = await Product.findById(product_id);
  if (!product) throw new Error("Product not found");

  const existed = await Wishlist.findOne({ user_id, product_id });
  if (existed) {
    const data = await populateWishlist(Wishlist.findById(existed._id));
    const enriched = await enrichWishlistItem(data);
    return {
      message: "Product already exists in wishlist",
      data: enriched,
    };
  }

  const created = await Wishlist.create({ user_id, product_id });
  const data = await populateWishlist(Wishlist.findById(created._id));
  const enriched = await enrichWishlistItem(data);
  return {
    message: "Add product to wishlist successfully",
    data: enriched,
  };
};

// Toggle wishlist (Them neu chua co, Xoa neu da co)
const toggleWishlist = async ({ user_id, product_id }) => {
  const existed = await Wishlist.findOne({ user_id, product_id });
  if (existed) {
    await Wishlist.findByIdAndDelete(existed._id);
    return {
      action: "removed",
      data: existed,
    };
  }

  const user = await User.findById(user_id);
  if (!user) throw new Error("User not found");

  const product = await Product.findById(product_id);
  if (!product) throw new Error("Product not found");

  const created = await Wishlist.create({ user_id, product_id });
  const data = await populateWishlist(Wishlist.findById(created._id));
  const enriched = await enrichWishlistItem(data);
  return {
    action: "added",
    data: enriched,
  };
};

// Xoa wishlist theo ID
const deleteWishlistById = async (id) => {
  const data = await Wishlist.findByIdAndDelete(id).select("-__v");
  if (!data) {
    throw new Error("Wishlist item not found");
  }
  return data;
};

// Xoa wishlist theo User va Product
const deleteWishlistByUserAndProduct = async (userId, productId) => {
  const data = await Wishlist.findOneAndDelete({ user_id: userId, product_id: productId }).select("-__v");
  if (!data) {
    throw new Error("Wishlist item not found");
  }
  return data;
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

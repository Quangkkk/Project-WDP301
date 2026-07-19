const Wishlist = require("../models/Wishlist.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");
const ProductVariant = require(
  "../models/ProductVariant.model"
);

const populateWishlist = (query) => {
  return query
    .populate(
      "user_id",
      "name email phone img_url"
    )
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

// Lay gia, anh va variants cua san pham
const enrichWishlistItem = async (item) => {
  if (!item || !item.product_id) {
    return item;
  }

  const itemObject = item.toObject
    ? item.toObject()
    : item;

  const product = itemObject.product_id;

  if (product && product._id) {
    const variants = await ProductVariant.find({
      product_id: product._id,
      is_active: true,
    }).lean();

    let lowestPrice = 0;
    let variantImage = null;

    if (variants.length > 0) {
      const prices = variants.map((variant) =>
        variant.sale_price > 0
          ? variant.sale_price
          : variant.price
      );

      lowestPrice = Math.min(...prices);

      const firstWithImage = variants.find(
        (variant) => variant.image
      );

      if (firstWithImage) {
        variantImage = firstWithImage.image;
      }
    }

    product.lowest_price = lowestPrice;
    product.image =
      variantImage || product.image || null;

    // Frontend WishlistPage dang lay product.variants[0]
    product.variants = variants;
  }

  return itemObject;
};

// Lay tat ca wishlist theo bo loc
const getAllWishlists = async (filter = {}) => {
  if (filter.user_id) {
    const userExists = await User.exists({
      _id: filter.user_id,
    });

    if (!userExists) {
      throw new Error("User not found");
    }
  }

  if (filter.product_id) {
    const productExists = await Product.exists({
      _id: filter.product_id,
    });

    if (!productExists) {
      throw new Error("Product not found");
    }
  }

  const items = await populateWishlist(
    Wishlist.find(filter)
  ).sort({
    created_at: -1,
  });

  return Promise.all(
    items.map(enrichWishlistItem)
  );
};

// Lay wishlist theo ID
const getWishlistById = async (id) => {
  const data = await populateWishlist(
    Wishlist.findById(id)
  );

  if (!data) {
    throw new Error("Wishlist item not found");
  }

  return enrichWishlistItem(data);
};

// Lay wishlist cua user
const getWishlistByUser = async (userId) => {
  const userExists = await User.exists({
    _id: userId,
  });

  if (!userExists) {
    throw new Error("User not found");
  }

  const items = await populateWishlist(
    Wishlist.find({
      user_id: userId,
    })
  ).sort({
    created_at: -1,
  });

  return Promise.all(
    items.map(enrichWishlistItem)
  );
};

// Kiem tra san pham co trong wishlist hay chua
const checkWishlist = async ({
  user_id,
  product_id,
}) => {
  const data = await Wishlist.findOne({
    user_id,
    product_id,
  }).select("-__v");

  return {
    exists: Boolean(data),
    data,
  };
};

// Them san pham vao wishlist
const addToWishlist = async ({
  user_id,
  product_id,
}) => {
  const user = await User.findById(user_id);

  if (!user) {
    throw new Error("User not found");
  }

  const product = await Product.findById(product_id);

  if (!product) {
    throw new Error("Product not found");
  }

  const existed = await Wishlist.findOne({
    user_id,
    product_id,
  });

  if (existed) {
    const data = await populateWishlist(
      Wishlist.findById(existed._id)
    );

    const enriched =
      await enrichWishlistItem(data);

    return {
      message:
        "Product already exists in wishlist",
      data: enriched,
    };
  }

  const created = await Wishlist.create({
    user_id,
    product_id,
  });

  const data = await populateWishlist(
    Wishlist.findById(created._id)
  );

  const enriched =
    await enrichWishlistItem(data);

  return {
    message:
      "Add product to wishlist successfully",
    data: enriched,
  };
};

// Them neu chua co, xoa neu da co
const toggleWishlist = async ({
  user_id,
  product_id,
}) => {
  const existed = await Wishlist.findOne({
    user_id,
    product_id,
  });

  if (existed) {
    await Wishlist.findByIdAndDelete(existed._id);

    return {
      action: "removed",
      data: existed,
    };
  }

  const user = await User.findById(user_id);

  if (!user) {
    throw new Error("User not found");
  }

  const product = await Product.findById(product_id);

  if (!product) {
    throw new Error("Product not found");
  }

  const created = await Wishlist.create({
    user_id,
    product_id,
  });

  const data = await populateWishlist(
    Wishlist.findById(created._id)
  );

  const enriched =
    await enrichWishlistItem(data);

  return {
    action: "added",
    data: enriched,
  };
};

// Xoa bang wishlist document ID hoac product ID
const deleteWishlistByIdentifier = async (
  userId,
  identifier
) => {
  let data = await Wishlist.findOneAndDelete({
    _id: identifier,
    user_id: userId,
  }).select("-__v");

  if (!data) {
    data = await Wishlist.findOneAndDelete({
      user_id: userId,
      product_id: identifier,
    }).select("-__v");
  }

  if (!data) {
    throw new Error("Wishlist item not found");
  }

  return data;
};

// Xoa wishlist theo document ID
const deleteWishlistById = async (id) => {
  const data =
    await Wishlist.findByIdAndDelete(id).select(
      "-__v"
    );

  if (!data) {
    throw new Error("Wishlist item not found");
  }

  return data;
};

// Xoa wishlist theo user va product
const deleteWishlistByUserAndProduct = async (
  userId,
  productId
) => {
  const data =
    await Wishlist.findOneAndDelete({
      user_id: userId,
      product_id: productId,
    }).select("-__v");

  if (!data) {
    throw new Error("Wishlist item not found");
  }

  return data;
};

// Dem tong so nguoi da them san pham vao wishlist
const countProductWishlist = async (productId) => {
  const productExists = await Product.exists({ _id: productId });

  if (!productExists) {
    throw new Error("Product not found");
  }

  return Wishlist.countDocuments({ product_id: productId });
};

module.exports = {
  getAllWishlists,
  getWishlistById,
  getWishlistByUser,
  countProductWishlist,
  checkWishlist,
  addToWishlist,
  toggleWishlist,
  deleteWishlistByIdentifier,
  deleteWishlistById,
  deleteWishlistByUserAndProduct,
};
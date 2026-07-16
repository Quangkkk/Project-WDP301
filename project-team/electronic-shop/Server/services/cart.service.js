const Cart = require("../models/Cart.model");
const CartItem = require("../models/CartItem.model");
const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");

// Helper thu thap id hop le va loai bo trung lap
const collectValidIds = (items, field) => {
  return [
    ...new Set(
      items
        .map((item) => item?.[field])
        .filter((value) => value)
        .map((value) => String(value))
    ),
  ];
};

const toMapById = (items) => {
  return new Map(items.map((item) => [String(item._id), item]));
};

// Tai danh sach items trong giop hang kem product va variant populate
const loadCartItems = async (cartId) => {
  const rawItems = await CartItem.find({ cart_id: cartId })
    .select("-__v")
    .sort({ created_at: -1 })
    .lean();

  if (rawItems.length === 0) return [];

  const productIds = collectValidIds(rawItems, "product_id");
  const variantIds = collectValidIds(rawItems, "variant_id");

  const [products, variants] = await Promise.all([
    Product.find({ _id: { $in: productIds } })
      .select("name sku status is_featured average_rating")
      .lean(),

    ProductVariant.find({ _id: { $in: variantIds } })
      .select("sku variant_value price sale_price image stock_quantity is_active")
      .lean(),
  ]);

  const productMap = toMapById(products);
  const variantMap = toMapById(variants);

  return rawItems.map((item) => ({
    ...item,
    product_id: productMap.get(String(item.product_id)) || item.product_id,
    variant_id: item.variant_id
      ? variantMap.get(String(item.variant_id)) || item.variant_id
      : null,
  }));
};

// Lay giot hang
const getCart = async (query) => {
  const cart = await Cart.findOne(query).select("-__v").lean();
  if (!cart) {
    return {
      cart: null,
      items: [],
      total: 0,
    };
  }

  const items = await loadCartItems(cart._id);
  const total = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  return {
    cart,
    items,
    total,
  };
};

// Them san pham vao giot hang (check ton kho variant trong service)
const addItemToCart = async (query, { product_id, variant_id, quantity = 1, price: bodyPrice }) => {
  const qty = Number(quantity || 1);
  if (qty < 1) {
    throw new Error("So luong phai lon hon 0");
  }

  // Check product ton tai
  const product = await Product.findById(product_id).lean();
  if (!product) {
    throw new Error("Khong tim thay san pham");
  }

  // Lay hoac tao moi gio hang
  const cart = await Cart.findOneAndUpdate(
    query,
    { $setOnInsert: query },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  let price = Number(bodyPrice || 0);
  let variantObjectId = null;

  if (variant_id) {
    // Check variant ton tai va active
    const variant = await ProductVariant.findById(variant_id).lean();
    if (!variant) {
      throw new Error("Khong tim thay phien ban san pham");
    }

    if (String(variant.product_id) !== String(product_id)) {
      throw new Error("Phien ban khong thuoc san pham nay");
    }

    if (!variant.is_active) {
      throw new Error("Phien ban san pham dang ngung ban");
    }

    // Lay so luong hien tai trong gio hang de cong don check ton kho
    const existingItem = await CartItem.findOne({
      cart_id: cart._id,
      product_id,
      variant_id,
    }).lean();

    const nextQuantity = Number(existingItem?.quantity || 0) + qty;
    if (Number(variant.stock_quantity || 0) < nextQuantity) {
      throw new Error("Khong du hang trong kho");
    }

    price = Number(variant.sale_price || 0) > 0 ? variant.sale_price : variant.price;
    variantObjectId = variant_id;
  }

  // Luu hoac update CartItem
  return await CartItem.findOneAndUpdate(
    {
      cart_id: cart._id,
      product_id,
      variant_id: variantObjectId,
    },
    {
      $inc: { quantity: qty },
      $set: { price },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  ).select("-__v");
};

// Cap nhat so luong cart item
const updateCartItem = async (itemId, { quantity, price }) => {
  const qty = Number(quantity);
  if (qty < 1) {
    throw new Error("So luong phai lon hon 0");
  }

  const currentItem = await CartItem.findById(itemId).lean();
  if (!currentItem) {
    throw new Error("Khong tim thay san pham trong giot hang");
  }

  // Check ton kho cua variant truoc khi update
  if (currentItem.variant_id) {
    const variant = await ProductVariant.findById(currentItem.variant_id).lean();
    if (variant && Number(variant.stock_quantity || 0) < qty) {
      throw new Error("Khong du hang trong kho");
    }
  }

  const updateData = { quantity: qty };
  if (price !== undefined) {
    updateData.price = Number(price);
  }

  return await CartItem.findByIdAndUpdate(itemId, updateData, {
    new: true,
    runValidators: true,
  }).select("-__v");
};

// Xoa 1 item khoi gio hang
const deleteCartItem = async (itemId) => {
  const data = await CartItem.findByIdAndDelete(itemId).select("-__v");
  if (!data) {
    throw new Error("Khong tim thay san pham trong giot hang");
  }
  return data;
};

// Xoa sach gio hang
const clearCart = async (query) => {
  const cart = await Cart.findOne(query).lean();
  if (!cart) {
    return { deletedCount: 0 };
  }

  const result = await CartItem.deleteMany({ cart_id: cart._id });
  return { deletedCount: result.deletedCount };
};

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  deleteCartItem,
  clearCart,
};

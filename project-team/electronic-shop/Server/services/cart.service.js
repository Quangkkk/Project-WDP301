const Cart = require("../models/Cart.model");
const CartItem = require("../models/CartItem.model");
const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");

const collectValidIds = (items, field) => [
  ...new Set(
    items
      .map((item) => item?.[field])
      .filter(Boolean)
      .map((value) => String(value))
  ),
];

const toMapById = (items) =>
  new Map(items.map((item) => [String(item._id), item]));

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
      .select(
        "product_id sku variant_value price sale_price image stock_quantity is_active"
      )
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

const getActiveVariant = async (productId, variantId) => {
  if (!variantId) {
    throw new Error("Vui long chon phien ban san pham");
  }

  const variant = await ProductVariant.findOne({
    _id: variantId,
    product_id: productId,
  }).lean();

  if (!variant) {
    throw new Error("Khong tim thay phien ban san pham");
  }

  if (!variant.is_active) {
    throw new Error("Phien ban san pham dang ngung ban");
  }

  return variant;
};

const getVariantPrice = (variant) =>
  Number(variant.sale_price || 0) > 0
    ? Number(variant.sale_price)
    : Number(variant.price);

const addItemToCart = async (
  query,
  { product_id, variant_id, quantity = 1 }
) => {
  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("So luong phai lon hon 0");
  }

  const product = await Product.findById(product_id).lean();

  if (!product) {
    throw new Error("Khong tim thay san pham");
  }

  if (String(product.status || "active").toLowerCase() !== "active") {
    throw new Error("San pham dang ngung ban");
  }

  const variant = await getActiveVariant(product_id, variant_id);

  const cart = await Cart.findOneAndUpdate(
    query,
    { $setOnInsert: query },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const existingItem = await CartItem.findOne({
    cart_id: cart._id,
    product_id,
    variant_id,
  }).lean();

  const nextQuantity = Number(existingItem?.quantity || 0) + qty;

  if (Number(variant.stock_quantity || 0) < nextQuantity) {
    throw new Error("Khong du hang trong kho");
  }

  return CartItem.findOneAndUpdate(
    {
      cart_id: cart._id,
      product_id,
      variant_id,
    },
    {
      $inc: { quantity: qty },
      $set: { price: getVariantPrice(variant) },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).select("-__v");
};

const findOwnedCartItem = async (query, itemId) => {
  const cart = await Cart.findOne(query).lean();

  if (!cart) {
    throw new Error("Khong tim thay gio hang");
  }

  const item = await CartItem.findOne({
    _id: itemId,
    cart_id: cart._id,
  });

  if (!item) {
    throw new Error("Khong tim thay san pham trong gio hang");
  }

  return item;
};

const updateCartItem = async (query, itemId, { quantity }) => {
  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("So luong phai lon hon 0");
  }

  const currentItem = await findOwnedCartItem(query, itemId);
  const variant = await getActiveVariant(
    currentItem.product_id,
    currentItem.variant_id
  );

  if (Number(variant.stock_quantity || 0) < qty) {
    throw new Error("Khong du hang trong kho");
  }

  currentItem.quantity = qty;
  currentItem.price = getVariantPrice(variant);

  await currentItem.save();
  return currentItem;
};

const deleteCartItem = async (query, itemId) => {
  const currentItem = await findOwnedCartItem(query, itemId);
  await currentItem.deleteOne();
  return currentItem;
};

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
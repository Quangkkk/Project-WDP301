const mongoose = require("mongoose");

const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");
const Brand = require("../models/Brand.model");
const Category = require("../models/Category.model");
const CartItem = require("../models/CartItem.model");
const OrderItem = require("../models/OrderItem.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  return [images];
};

const createVariantPayload = (variant, productId) => ({
  product_id: productId,
  sku: variant.sku,
  variant_name: variant.variant_name,
  color: variant.color || null,
  storage: variant.storage || null,
  ram: variant.ram || null,
  attributes_json: variant.attributes_json || {},
  images: normalizeImages(variant.images),
  price: variant.price,
  sale_price: variant.sale_price || 0,
  stock_quantity: variant.stock_quantity || 0,
  status: variant.status || "active",
});

const createProduct = async (req, res) => {
  try {
    const {
      brand_id,
      category_id,
      name,
      sku,
      description,
      total_cart_addition,
      status,
      is_featured,
      images,
      price,
      sale_price,
      variants,
    } = req.body;

    if (!brand_id || !category_id || !name || !sku) {
      return res.status(400).json({
        success: false,
        message: "brand_id, category_id, name and sku are required",
      });
    }

    if (!isValidObjectId(brand_id) || !isValidObjectId(category_id)) {
      return res.status(400).json({ success: false, message: "Invalid brand_id or category_id" });
    }

    const [brand, category] = await Promise.all([Brand.findById(brand_id), Category.findById(category_id)]);
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const existedSku = await Product.findOne({ sku });
    if (existedSku) return res.status(409).json({ success: false, message: "Product SKU already exists" });

    const product = await Product.create({
      brand_id,
      category_id,
      name,
      sku,
      description,
      total_cart_addition,
      status,
      is_featured,
      images: normalizeImages(images),
      price: price || 0,
      sale_price: sale_price || 0,
    });

    let createdVariants = [];
    if (Array.isArray(variants) && variants.length > 0) {
      for (const variant of variants) {
        if (!variant.sku || !variant.variant_name || variant.price === undefined) {
          await Product.findByIdAndDelete(product._id);
          return res.status(400).json({
            success: false,
            message: "Each variant must have sku, variant_name and price",
          });
        }
      }
      createdVariants = await ProductVariant.insertMany(variants.map((variant) => createVariantPayload(variant, product._id)));
    }

    return res.status(201).json({
      success: true,
      message: "Create product successfully",
      data: { product, variants: createdVariants },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create product", error: error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const { category_id, brand_id, status, featured, q } = req.query;
    const filter = {};
    if (category_id) filter.category_id = category_id;
    if (brand_id) filter.brand_id = brand_id;
    if (status) filter.status = status;
    if (featured !== undefined) filter.is_featured = featured === "true";
    if (q) filter.$or = [{ name: new RegExp(q, "i") }, { sku: new RegExp(q, "i") }];

    const products = await Product.find(filter)
      .populate("brand_id", "name logo_img status")
      .populate("category_id", "name status")
      .sort({ createdAt: -1 })
      .lean();

    const productIds = products.map((product) => product._id);
    const variants = await ProductVariant.find({ product_id: { $in: productIds } }).select("-__v").lean();
    const variantsByProduct = variants.reduce((map, variant) => {
      const key = String(variant.product_id);
      if (!map[key]) map[key] = [];
      map[key].push(variant);
      return map;
    }, {});

    const data = products.map((product) => ({ ...product, variants: variantsByProduct[String(product._id)] || [] }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get products", error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid product id" });

    const product = await Product.findById(id)
      .populate("brand_id", "name logo_img status")
      .populate("category_id", "name status")
      .select("-__v")
      .lean();

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const variants = await ProductVariant.find({ product_id: id }).select("-__v").sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: { product, variants } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get product", error: error.message });
  }
};

const getProductByCategory = async (req, res) => {
  req.query.category_id = req.params.id;
  return getAllProducts(req, res);
};

const getProductByBrand = async (req, res) => {
  req.query.brand_id = req.params.id;
  return getAllProducts(req, res);
};

const updateProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid product id" });

    const allowedFields = [
      "brand_id",
      "category_id",
      "name",
      "sku",
      "description",
      "total_cart_addition",
      "status",
      "is_featured",
      "images",
      "price",
      "sale_price",
      "average_rating",
      "rating_count",
    ];
    const updateData = {};
    for (const field of allowedFields) if (req.body[field] !== undefined) updateData[field] = req.body[field];
    if (req.body.images !== undefined) updateData.images = normalizeImages(req.body.images);

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

    const data = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("brand_id", "name logo_img status")
      .populate("category_id", "name status")
      .select("-__v");

    if (!data) return res.status(404).json({ success: false, message: "Product not found" });
    return res.status(200).json({ success: true, message: "Update product successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update product", error: error.message });
  }
};

const deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid product id" });

    const data = await Product.findByIdAndDelete(id);
    if (!data) return res.status(404).json({ success: false, message: "Product not found" });

    await ProductVariant.deleteMany({ product_id: id });
    await CartItem.deleteMany({ product_id: id });

    return res.status(200).json({ success: true, message: "Delete product successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
  }
};

const createVariant = async (req, res) => {
  try {
    const product_id = req.params.productId || req.body.product_id;
    if (!isValidObjectId(product_id)) return res.status(400).json({ success: false, message: "Invalid product_id" });

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (!req.body.sku || !req.body.variant_name || req.body.price === undefined) {
      return res.status(400).json({ success: false, message: "sku, variant_name and price are required" });
    }

    const data = await ProductVariant.create(createVariantPayload(req.body, product_id));
    return res.status(201).json({ success: true, message: "Create variant successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create variant", error: error.message });
  }
};

const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid variant id" });

    const allowedFields = ["sku", "variant_name", "color", "storage", "ram", "attributes_json", "images", "price", "sale_price", "stock_quantity", "status"];
    const updateData = {};
    for (const field of allowedFields) if (req.body[field] !== undefined) updateData[field] = req.body[field];
    if (req.body.images !== undefined) updateData.images = normalizeImages(req.body.images);

    const data = await ProductVariant.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Variant not found" });
    return res.status(200).json({ success: true, message: "Update variant successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update variant", error: error.message });
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid variant id" });

    const inOrder = await OrderItem.exists({ variant_id: id });
    if (inOrder) {
      return res.status(409).json({ success: false, message: "This variant is used in orders, please set status to inactive instead of deleting" });
    }

    const data = await ProductVariant.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Variant not found" });
    await CartItem.deleteMany({ variant_id: id });
    return res.status(200).json({ success: true, message: "Delete variant successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete variant", error: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  getProductByCategory,
  getProductByBrand,
  updateProductById,
  deleteProductById,
  createVariant,
  updateVariant,
  deleteVariant,
};
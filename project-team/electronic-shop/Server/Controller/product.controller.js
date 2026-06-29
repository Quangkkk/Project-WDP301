const mongoose = require("mongoose");

const Product = require("../models/Product.model");
const ProductVariant = require("../models/ProductVariant.model");
const Brand = require("../models/Brand.model");
const Category = require("../models/Category.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const pickVariantValue = (body) => body.variant_value || body.variant_name || body.name || body.value;
const pickVariantImage = (body) => {
  if (body.image !== undefined) return body.image;
  if (Array.isArray(body.images)) return body.images[0] || null;
  return body.images || null;
};

const buildVariantPayload = (body, productId) => ({
  product_id: productId || body.product_id,
  sku: body.sku,
  variant_value: pickVariantValue(body),
  price: body.price,
  image: pickVariantImage(body),
  attributes_json: body.attributes_json || {},
  weight: body.weight ?? null,
  sale_price: body.sale_price ?? 0,
  stock_quantity: body.stock_quantity ?? 0,
  is_active: body.is_active !== undefined ? body.is_active : body.status ? body.status === "active" : true,
});

const createProduct = async (req, res) => {
  try {
    const {
      brand_id,
      category_id,
      name,
      sku,
      description,
      total_review,
      average_rating,
      rating_count,
      status,
      is_featured,
      variants,
    } = req.body;

    if (!brand_id || !category_id || !name || !sku) {
      return res.status(400).json({ success: false, message: "brand_id, category_id, name and sku are required" });
    }

    if (!isValidObjectId(brand_id) || !isValidObjectId(category_id)) {
      return res.status(400).json({ success: false, message: "Invalid brand_id or category_id" });
    }

    const [brand, category] = await Promise.all([Brand.findById(brand_id), Category.findById(category_id)]);
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const existedSku = await Product.findOne({ sku: String(sku).toUpperCase().trim() });
    if (existedSku) return res.status(409).json({ success: false, message: "Product SKU already exists" });

    const product = await Product.create({
      brand_id,
      category_id,
      name,
      sku,
      description: description || null,
      total_review: total_review ?? 0,
      average_rating: average_rating ?? 0,
      rating_count: rating_count ?? 0,
      status: status || "active",
      is_featured: Boolean(is_featured),
    });

    let createdVariants = [];
    if (Array.isArray(variants) && variants.length > 0) {
      const payload = variants.map((variant) => {
        const variantPayload = buildVariantPayload(variant, product._id);
        if (!variantPayload.sku || !variantPayload.variant_value || variantPayload.price === undefined) {
          throw new Error("Each variant must have sku, variant_value and price");
        }
        return variantPayload;
      });
      createdVariants = await ProductVariant.insertMany(payload);
    }

    return res.status(201).json({ success: true, message: "Create product successfully", data: { product, variants: createdVariants } });
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
    if (featured !== undefined) filter.is_featured = featured === "true" || featured === true;
    if (q) filter.$text = { $search: q };

    const products = await Product.find(filter)
      .populate("brand_id", "name logo_img status")
      .populate("category_id", "name status")
      .select("-__v")
      .sort({ created_at: -1 })
      .lean();

    const productIds = products.map((product) => product._id);
    const variants = await ProductVariant.find({ product_id: { $in: productIds }, is_active: true }).select("-__v").lean();
    const variantsByProduct = variants.reduce((acc, variant) => {
      const key = String(variant.product_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(variant);
      return acc;
    }, {});

    const data = products.map((product) => ({
      ...product,
      variants: variantsByProduct[String(product._id)] || [],
    }));

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
      .select("-__v");

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const variants = await ProductVariant.find({ product_id: id }).select("-__v").sort({ created_at: -1 });
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
      "total_review",
      "average_rating",
      "rating_count",
      "status",
      "is_featured",
    ];

    const updateData = {};
    for (const field of allowedFields) if (req.body[field] !== undefined) updateData[field] = req.body[field];

    if (updateData.brand_id && !isValidObjectId(updateData.brand_id)) return res.status(400).json({ success: false, message: "Invalid brand_id" });
    if (updateData.category_id && !isValidObjectId(updateData.category_id)) return res.status(400).json({ success: false, message: "Invalid category_id" });

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

    const data = await Product.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Product not found" });

    await ProductVariant.deleteMany({ product_id: id });
    return res.status(200).json({ success: true, message: "Delete product successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete product", error: error.message });
  }
};

const createVariant = async (req, res) => {
  try {
    const product_id = req.params.productId || req.body.product_id;
    if (!product_id || !isValidObjectId(product_id)) return res.status(400).json({ success: false, message: "Valid product_id is required" });

    const product = await Product.findById(product_id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const payload = buildVariantPayload(req.body, product_id);
    if (!payload.sku || !payload.variant_value || payload.price === undefined) {
      return res.status(400).json({ success: false, message: "sku, variant_value and price are required" });
    }

    const data = await ProductVariant.create(payload);
    return res.status(201).json({ success: true, message: "Create product variant successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create product variant", error: error.message });
  }
};

const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid variant id" });

    const allowedFields = ["product_id", "sku", "variant_value", "price", "image", "attributes_json", "weight", "sale_price", "stock_quantity", "is_active"];
    const updateData = {};

    for (const field of allowedFields) if (req.body[field] !== undefined) updateData[field] = req.body[field];
    if (req.body.variant_name !== undefined && updateData.variant_value === undefined) updateData.variant_value = req.body.variant_name;
    if (req.body.images !== undefined && updateData.image === undefined) updateData.image = Array.isArray(req.body.images) ? req.body.images[0] || null : req.body.images;
    if (req.body.status !== undefined && updateData.is_active === undefined) updateData.is_active = req.body.status === "active";

    if (Object.keys(updateData).length === 0) return res.status(400).json({ success: false, message: "No data to update" });

    const data = await ProductVariant.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Product variant not found" });
    return res.status(200).json({ success: true, message: "Update product variant successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update product variant", error: error.message });
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid variant id" });

    const data = await ProductVariant.findByIdAndDelete(id).select("-__v");
    if (!data) return res.status(404).json({ success: false, message: "Product variant not found" });
    return res.status(200).json({ success: true, message: "Delete product variant successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete product variant", error: error.message });
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

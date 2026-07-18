const mongoose = require("mongoose");
const productService = require("../services/product.service");

// Helper check ObjectId hop le
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Controller tao san pham moi (Admin/Manager)
const createProduct = async (req, res) => {
  try {
    const { brand_id, category_id, name, sku } = req.body;

    if (!brand_id || !category_id || !name || !sku) {
      return res.status(400).json({ success: false, message: "brand_id, category_id, name and sku are required" });
    }

    if (!isValidObjectId(brand_id) || !isValidObjectId(category_id)) {
      return res.status(400).json({ success: false, message: "Invalid brand_id or category_id" });
    }

    const data = await productService.createProduct(req.body);
    return res.status(201).json({ success: true, message: "Create product successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Brand not found" || error.message === "Category not found") {
      statusCode = 404;
    } else if (error.message === "Product SKU already exists") {
      statusCode = 409;
    } else if (error.message.includes("must have sku, variant_value and price")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to create product", error: error.message });
  }
};

// Controller lay tat ca san pham (voi ho tro tim kiem, phan trang, brand, category, price range)
const getAllProducts = async (req, res) => {
  try {
    const { category_id, brand_id, status, featured, q, min_price, max_price, page, limit } = req.query;

    const data = await productService.getAllProducts({
      category_id,
      brand_id,
      status,
      featured,
      q,
      min_price,
      max_price,
      page,
      limit,
    });

    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to get products", error: error.message });
  }
};

// Controller lay san pham theo ID (kem variants)
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const data = await productService.getProductById(id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Product not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to get product", error: error.message });
  }
};

// Controller lay san pham theo Category
const getProductByCategory = async (req, res) => {
  req.query.category_id = req.params.id;
  return getAllProducts(req, res);
};

// Controller lay san pham theo Brand
const getProductByBrand = async (req, res) => {
  req.query.brand_id = req.params.id;
  return getAllProducts(req, res);
};

// Controller cap nhat san pham theo ID (Admin/Manager)
const updateProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const { brand_id, category_id } = req.body;
    if (brand_id && !isValidObjectId(brand_id)) return res.status(400).json({ success: false, message: "Invalid brand_id" });
    if (category_id && !isValidObjectId(category_id)) return res.status(400).json({ success: false, message: "Invalid category_id" });

    const data = await productService.updateProductById(id, req.body);
    return res.status(200).json({ success: true, message: "Update product successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Product not found" || error.message === "Brand not found" || error.message === "Category not found") {
      statusCode = 404;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to update product", error: error.message });
  }
};

// Controller xoa san pham (Admin/Manager)
const deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const data = await productService.deleteProductById(id);
    return res.status(200).json({ success: true, message: "Delete product successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Product not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to delete product", error: error.message });
  }
};

// Controller tao product variant (Admin/Manager)
const createVariant = async (req, res) => {
  try {
    const product_id = req.params.productId || req.body.product_id;
    if (!product_id || !isValidObjectId(product_id)) {
      return res.status(400).json({ success: false, message: "Valid product_id is required" });
    }

    const data = await productService.createVariant(product_id, req.body);
    return res.status(201).json({ success: true, message: "Create product variant successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Product not found") {
      statusCode = 404;
    } else if (error.message.includes("required")) {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to create product variant", error: error.message });
  }
};

// Controller cap nhat product variant (Admin/Manager)
const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid variant id" });
    }

    const data = await productService.updateVariant(id, req.body);
    return res.status(200).json({ success: true, message: "Update product variant successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Product variant not found") {
      statusCode = 404;
    } else if (error.message === "No data to update") {
      statusCode = 400;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to update product variant", error: error.message });
  }
};

// Controller xoa product variant (Admin/Manager)
const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid variant id" });
    }

    const data = await productService.deleteVariant(id);
    return res.status(200).json({ success: true, message: "Delete product variant successfully", data });
  } catch (error) {
    let statusCode = 500;
    if (error.message === "Product variant not found") {
      statusCode = 404;
    }
    return res.status(statusCode).json({ success: false, message: error.message || "Failed to delete product variant", error: error.message });
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

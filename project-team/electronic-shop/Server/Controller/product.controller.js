const mongoose = require("mongoose");
const Product = require("../Model/Product.model");
const Brand = require("../Model/Brand.model");
const Category = require("../Model/Category.model");
const ProductDetail = require("../Model/ProductDetail.model");

const productPopulateOptions = [
  {
    path: "brand_id",
    select: "name img_url",
  },
  {
    path: "category_id",
    select: "name",
  },
  {
    path: "product_detail_id",
    select: "chip memory RAM SIM screen_size color",
  },
];

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const validateReferenceIds = async ({ brand_id, category_id, product_detail_id }) => {
  if (category_id) {
    if (!isValidObjectId(category_id)) {
      return {
        success: false,
        status: 400,
        message: "Invalid category_id",
      };
    }

    const category = await Category.findById(category_id);

    if (!category) {
      return {
        success: false,
        status: 404,
        message: "Category not found",
      };
    }
  }

  if (brand_id) {
    if (!isValidObjectId(brand_id)) {
      return {
        success: false,
        status: 400,
        message: "Invalid brand_id",
      };
    }

    const brand = await Brand.findById(brand_id);

    if (!brand) {
      return {
        success: false,
        status: 404,
        message: "Brand not found",
      };
    }
  }

  if (product_detail_id) {
    if (!isValidObjectId(product_detail_id)) {
      return {
        success: false,
        status: 400,
        message: "Invalid product_detail_id",
      };
    }

    const productDetail = await ProductDetail.findById(product_detail_id);

    if (!productDetail) {
      return {
        success: false,
        status: 404,
        message: "Product detail not found",
      };
    }
  }

  return {
    success: true,
  };
};

const createProduct = async (req, res) => {
  try {
    const {
      name,
      img_url,
      description,
      price,
      brand_id,
      category_id,
      product_detail_id,
    } = req.body;

    if (!name || !img_url || !description || price === undefined || !category_id) {
      return res.status(400).json({
        success: false,
        message: "name, img_url, description, price and category_id are required",
      });
    }

    const referenceValidation = await validateReferenceIds({
      brand_id,
      category_id,
      product_detail_id,
    });

    if (!referenceValidation.success) {
      return res.status(referenceValidation.status).json({
        success: false,
        message: referenceValidation.message,
      });
    }

    if (product_detail_id) {
      const existedProductDetail = await Product.findOne({ product_detail_id });

      if (existedProductDetail) {
        return res.status(409).json({
          success: false,
          message: "This product_detail_id is already used by another product",
        });
      }
    }

    const productPayload = {
      name,
      img_url,
      description,
      price,
      category_id,
    };

    if (brand_id) {
      productPayload.brand_id = brand_id;
    }

    if (product_detail_id) {
      productPayload.product_detail_id = product_detail_id;
    }

    const product = await Product.create(productPayload);

    const populatedProduct = await Product.findById(product._id).populate(
      productPopulateOptions
    );

    return res.status(201).json({
      success: true,
      message: "Create product successfully",
      data: populatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate(productPopulateOptions)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Get products successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findById(id).populate(productPopulateOptions);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get product detail successfully",
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get product detail",
      error: error.message,
    });
  }
};

const getProductByCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category id",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const products = await Product.find({ category_id: id })
      .populate(productPopulateOptions)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Get products by category successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get products by category",
      error: error.message,
    });
  }
};

const getProductByBrand = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid brand id",
      });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const products = await Product.find({ brand_id: id })
      .populate(productPopulateOptions)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Get products by brand successfully",
      count: products.length,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get products by brand",
      error: error.message,
    });
  }
};

const updateProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const {
      name,
      img_url,
      description,
      price,
      brand_id,
      category_id,
      product_detail_id,
    } = req.body;

    const referenceValidation = await validateReferenceIds({
      brand_id,
      category_id,
      product_detail_id:
        product_detail_id === "" || product_detail_id === null
          ? undefined
          : product_detail_id,
    });

    if (!referenceValidation.success) {
      return res.status(referenceValidation.status).json({
        success: false,
        message: referenceValidation.message,
      });
    }

    if (product_detail_id) {
      const existedProductDetail = await Product.findOne({
        product_detail_id,
        _id: { $ne: id },
      });

      if (existedProductDetail) {
        return res.status(409).json({
          success: false,
          message: "This product_detail_id is already used by another product",
        });
      }
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (img_url !== undefined) updateData.img_url = img_url;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (brand_id !== undefined) updateData.brand_id = brand_id;
    if (category_id !== undefined) updateData.category_id = category_id;

    if (product_detail_id !== undefined && product_detail_id !== null && product_detail_id !== "") {
      updateData.product_detail_id = product_detail_id;
    }

    const updateQuery = {
      $set: updateData,
    };

    if (product_detail_id === null || product_detail_id === "") {
      updateQuery.$unset = {
        product_detail_id: "",
      };
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateQuery, {
      new: true,
      runValidators: true,
    }).populate(productPopulateOptions);

    return res.status(200).json({
      success: true,
      message: "Update product successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

const deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delete product successfully",
      data: deletedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
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
};
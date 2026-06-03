const Product = require("../Model/Products.model");
const Variant = require("../Model/Variant.model");
require("../Model/Brand.model");
require("../Model/Categories.model");

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("brandId", "name slug imageUrl")
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 })
      .lean();

    const productIds = products.map((product) => product._id);

    const variants = await Variant.find({
      productId: { $in: productIds },
      status: "active",
    }).lean();

    const productsWithVariants = products.map((product) => {
      return {
        ...product,
        variants: variants.filter(
          (variant) => variant.productId.toString() === product._id.toString()
        ),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Get products successfully",
      count: productsWithVariants.length,
      data: productsWithVariants,
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

    const product = await Product.findById(id)
      .populate("brandId", "name slug imageUrl")
      .populate("categoryId", "name slug")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = await Variant.find({
      productId: id,
      status: "active",
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Get product detail successfully",
      data: {
        ...product,
        variants,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get product detail",
      error: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById
};
const mongoose = require("mongoose");
const productService = require("../services/product.service");

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(String(id || ""));

const getProductErrorStatus = (error) => {
  const message = String(error?.message || "");

  if (error?.code === 11000 || message.includes("đã tồn tại")) {
    return 409;
  }

  if (message.includes("Không tìm thấy")) {
    return 404;
  }

  if (
    message.includes("Vui lòng") ||
    message.includes("không hợp lệ") ||
    message.includes("Không có dữ liệu") ||
    message.includes("không được") ||
    message.includes("phải có")
  ) {
    return 400;
  }

  return 500;
};

const sendProductError = (res, error, fallbackMessage) =>
  res.status(getProductErrorStatus(error)).json({
    success: false,
    message: error?.message || fallbackMessage,
    error: error?.message,
  });

// Tải ảnh sản phẩm/phiên bản từ máy tính của Manager/Admin.
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh để tải lên.",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/uploads/products/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: "Tải ảnh sản phẩm thành công.",
      data: {
        url,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    return sendProductError(res, error, "Không tải được ảnh sản phẩm.");
  }
};

// Tạo sản phẩm mới kèm các phiên bản.
const createProduct = async (req, res) => {
  try {
    const { brand_id, category_id, name, sku } = req.body;

    if (!brand_id || !category_id || !name || !sku) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập đầy đủ thương hiệu, danh mục, tên và SKU sản phẩm.",
      });
    }

    if (!isValidObjectId(brand_id) || !isValidObjectId(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Thương hiệu hoặc danh mục không hợp lệ.",
      });
    }

    const data = await productService.createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công.",
      data,
    });
  } catch (error) {
    return sendProductError(res, error, "Không tạo được sản phẩm.");
  }
};

// Lấy danh sách sản phẩm, hỗ trợ tìm kiếm, lọc và phân trang.
const getAllProducts = async (req, res) => {
  try {
    const {
      category_id,
      brand_id,
      status,
      featured,
      q,
      min_price,
      max_price,
      page,
      limit,
    } = req.query;

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
    return sendProductError(res, error, "Không tải được danh sách sản phẩm.");
  }
};

// Lấy chi tiết sản phẩm và toàn bộ phiên bản.
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    const data = await productService.getProductById(id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendProductError(res, error, "Không tải được sản phẩm.");
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

// Cập nhật thông tin chung của sản phẩm.
const updateProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    const { brand_id, category_id } = req.body;

    if (brand_id && !isValidObjectId(brand_id)) {
      return res.status(400).json({
        success: false,
        message: "Thương hiệu không hợp lệ.",
      });
    }

    if (category_id && !isValidObjectId(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Danh mục không hợp lệ.",
      });
    }

    const data = await productService.updateProductById(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công.",
      data,
    });
  } catch (error) {
    return sendProductError(res, error, "Không cập nhật được sản phẩm.");
  }
};

const deleteProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    const data = await productService.deleteProductById(id);

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công.",
      data,
    });
  } catch (error) {
    return sendProductError(res, error, "Không xóa được sản phẩm.");
  }
};

const createVariant = async (req, res) => {
  try {
    const productId = req.params.productId || req.body.product_id;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    const data = await productService.createVariant(productId, req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo phiên bản sản phẩm thành công.",
      data,
    });
  } catch (error) {
    return sendProductError(res, error, "Không tạo được phiên bản sản phẩm.");
  }
};

const updateVariant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã phiên bản sản phẩm không hợp lệ.",
      });
    }

    const data = await productService.updateVariant(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Cập nhật phiên bản sản phẩm thành công.",
      data,
    });
  } catch (error) {
    return sendProductError(res, error, "Không cập nhật được phiên bản sản phẩm.");
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Mã phiên bản sản phẩm không hợp lệ.",
      });
    }

    const data = await productService.deleteVariant(id);

    return res.status(200).json({
      success: true,
      message: "Xóa phiên bản sản phẩm thành công.",
      data,
    });
  } catch (error) {
    return sendProductError(res, error, "Không xóa được phiên bản sản phẩm.");
  }
};

module.exports = {
  uploadProductImage,
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
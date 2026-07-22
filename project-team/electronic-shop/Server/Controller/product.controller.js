const mongoose = require("mongoose");
const productService = require("../services/product.service");
const cloudinaryUploadService = require("../services/cloudinaryUpload.service");

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

// Tải ảnh sản phẩm/phiên bản từ máy tính lên Cloudinary.
const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng chọn ảnh để tải lên.",
      });
    }

    console.log(
      "Uploading product image:",
      {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      }
    );

    const uploaded =
      await cloudinaryUploadService.uploadBuffer(
        req.file,
        {
          folder:
            process.env
              .CLOUDINARY_PRODUCT_FOLDER ||
            "techsale/products",

          resourceType: "image",
        }
      );

    return res.status(201).json({
      success: true,
      message:
        "Tải ảnh sản phẩm lên Cloudinary thành công.",

      data: {
        url: uploaded.secure_url,
        secure_url:
          uploaded.secure_url,

        public_id:
          uploaded.public_id,

        resource_type:
          uploaded.resource_type,

        format:
          uploaded.format,

        width:
          uploaded.width,

        height:
          uploaded.height,

        filename:
          uploaded.public_id,

        mimetype:
          req.file.mimetype,

        size:
          uploaded.bytes ||
          req.file.size,

        provider:
          "cloudinary",
      },
    });
  } catch (error) {
    console.error(
      "Upload product image failed:",
      error
    );

    const message =
      error?.message ||
      "Không tải được ảnh sản phẩm lên Cloudinary.";

    let statusCode = 500;

    if (
      message.includes("chưa được cấu hình") ||
      message.includes("giá trị mẫu")
    ) {
      statusCode = 503;
    }

    if (
      message.toLowerCase().includes("invalid api key") ||
      message.toLowerCase().includes("invalid signature") ||
      message.toLowerCase().includes("unknown api key")
    ) {
      statusCode = 401;
    }

    return res.status(statusCode).json({
      success: false,
      message,
      error: message,
    });
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
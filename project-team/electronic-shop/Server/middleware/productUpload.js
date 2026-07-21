const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "../uploads/products");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)
      ? extension
      : ".jpg";

    callback(
      null,
      `product-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`
    );
  },
});

const productUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF."));
    }

    return callback(null, true);
  },
});

module.exports = productUpload;
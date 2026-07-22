const path = require("path");

const {
  cloudinary,
  assertCloudinaryConfigured,
} = require("../config/cloudinary");

const normalizeFolder = (folder) =>
  String(folder || "techsale/misc")
    .trim()
    .replace(/^\/+|\/+$/g, "") ||
  "techsale/misc";

const createSafePublicId = (file) => {
  const originalName = String(
    file?.originalname || "product-image"
  ).trim();

  const extension = path.extname(originalName);
  const baseName = path.basename(
    originalName,
    extension
  );

  const safeName =
    baseName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "product-image";

  return `${safeName}-${Date.now()}`;
};

const uploadBuffer = (
  file,
  options = {}
) => {
  assertCloudinaryConfigured();

  if (!file) {
    throw new Error(
      "Không tìm thấy file cần upload."
    );
  }

  if (!file.buffer) {
    throw new Error(
      "File upload không có buffer. Middleware multer phải sử dụng memoryStorage()."
    );
  }

  const folder = normalizeFolder(
    options.folder
  );

  const resourceType =
    options.resourceType ||
    options.resource_type ||
    "auto";

  const publicId = createSafePublicId(file);

  return new Promise((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: resourceType,
          overwrite: false,
          unique_filename: false,
          use_filename: false,
        },
        (error, result) => {
          if (error) {
            console.error(
              "Cloudinary upload error:",
              {
                message: error.message,
                http_code: error.http_code,
                name: error.name,
              }
            );

            return reject(
              new Error(
                error.message ||
                  "Cloudinary từ chối upload file."
              )
            );
          }

          if (!result?.secure_url) {
            return reject(
              new Error(
                "Cloudinary không trả về secure_url."
              )
            );
          }

          return resolve(result);
        }
      );

    uploadStream.on("error", (error) => {
      console.error(
        "Cloudinary stream error:",
        error
      );

      reject(
        new Error(
          error.message ||
            "Lỗi stream khi upload Cloudinary."
        )
      );
    });

    uploadStream.end(file.buffer);
  });
};

const mapUploadResultToAttachment = (
  file,
  result
) => ({
  original_name:
    file.originalname ||
    result.original_filename ||
    "file",

  filename: result.public_id || "",
  public_id: result.public_id || "",

  resource_type:
    result.resource_type || "raw",

  format: result.format || "",
  provider: "cloudinary",

  mime_type:
    file.mimetype ||
    "application/octet-stream",

  size: Number(
    result.bytes ||
      file.size ||
      0
  ),

  url:
    result.secure_url ||
    result.url ||
    "",

  type: String(
    file.mimetype || ""
  ).startsWith("image/")
    ? "image"
    : "file",
});

const uploadFiles = async (
  files = [],
  options = {}
) => {
  const inputFiles =
    Array.isArray(files)
      ? files
      : [];

  const results = [];

  for (const file of inputFiles) {
    const uploaded =
      await uploadBuffer(
        file,
        options
      );

    results.push(
      mapUploadResultToAttachment(
        file,
        uploaded
      )
    );
  }

  return results;
};

module.exports = {
  uploadBuffer,
  uploadFiles,
  mapUploadResultToAttachment,
};
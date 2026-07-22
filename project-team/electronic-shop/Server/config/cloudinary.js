const path = require("path");
const dotenv = require("dotenv");
const { v2: cloudinary } = require("cloudinary");

dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

const normalizeEnv = (value) =>
  String(value || "").trim();

const cloudName = normalizeEnv(
  process.env.CLOUDINARY_CLOUD_NAME
);

const apiKey = normalizeEnv(
  process.env.CLOUDINARY_API_KEY
);

const apiSecret = normalizeEnv(
  process.env.CLOUDINARY_API_SECRET
);

const cloudinaryUrl = normalizeEnv(
  process.env.CLOUDINARY_URL
);

const isPlaceholder = (value) => {
  const normalized = String(value || "").toLowerCase();

  return (
    !normalized ||
    normalized.includes("your_") ||
    normalized.includes("your-") ||
    normalized.includes("example") ||
    normalized.includes("thật_của_bạn")
  );
};

if (
  !isPlaceholder(cloudName) &&
  !isPlaceholder(apiKey) &&
  !isPlaceholder(apiSecret)
) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
} else if (
  cloudinaryUrl &&
  !isPlaceholder(cloudinaryUrl)
) {
  cloudinary.config({
    secure: true,
  });
} else {
  cloudinary.config({
    cloud_name: "",
    api_key: "",
    api_secret: "",
    secure: true,
  });
}

const assertCloudinaryConfigured = () => {
  const config = cloudinary.config();

  if (
    !config.cloud_name ||
    !config.api_key ||
    !config.api_secret
  ) {
    throw new Error(
      "Cloudinary chưa được cấu hình đúng. Hãy kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET trong Server/.env."
    );
  }

  if (
    isPlaceholder(config.cloud_name) ||
    isPlaceholder(config.api_key) ||
    isPlaceholder(config.api_secret)
  ) {
    throw new Error(
      "Cloudinary đang dùng giá trị mẫu. Hãy thay bằng credential thật trong Server/.env."
    );
  }

  return config;
};

const getCloudinaryConfigStatus = () => {
  const config = cloudinary.config();

  return {
    configured: Boolean(
      config.cloud_name &&
        config.api_key &&
        config.api_secret
    ),
    cloud_name: config.cloud_name || "",
    api_key_present: Boolean(config.api_key),
    api_secret_present: Boolean(config.api_secret),
  };
};

module.exports = {
  cloudinary,
  assertCloudinaryConfigured,
  getCloudinaryConfigStatus,
};
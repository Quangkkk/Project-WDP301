const jwt = require("jsonwebtoken");

// Cho phép request không có token tiếp tục như guest.
// Nếu request đã gửi token nhưng token sai/hết hạn thì trả lỗi rõ ràng,
// không âm thầm coi tài khoản đó là guest.
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
  const cookieToken = req.cookies?.token;
  const token = bearerToken || cookieToken;

  if (!token) {
    req.user = null;
    req.user_id = null;
    req.role_id = null;
    req.role = null;
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_secret_key"
    );

    req.user = decoded;
    req.user_id = decoded.user_id;
    req.role_id = decoded.role_id;
    req.role = decoded.role;

    return next();
  } catch (_error) {
    return res.status(403).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }
};

module.exports = optionalAuth;
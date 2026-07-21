const jwt = require("jsonwebtoken");

const optionalVerifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const cookieToken = req.cookies?.token;
  const token = bearerToken || cookieToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_key");
    req.user = decoded;
    req.user_id = decoded.user_id;
    req.role_id = decoded.role_id;
    req.role = decoded.role;
  } catch (error) {
    // If token is expired or invalid, proceed without throwing, treating request as guest
  }
  next();
};

module.exports = optionalVerifyToken;

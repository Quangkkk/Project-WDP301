// In-memory rate limiter de chan brute-force ma don hang tu khach vang lai (Guest)
// Gioi han toi da 5 requests trong vong 1 phut cho moi dia chi IP
const ipRequestTimes = new Map();

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
  const now = Date.now();
  const timeframeMs = 60 * 1000; // 1 phut
  const maxRequests = 5;

  if (!ipRequestTimes.has(ip)) {
    ipRequestTimes.set(ip, [now]);
    return next();
  }

  const timestamps = ipRequestTimes.get(ip);
  // Loc lay cac request trong vong 1 phut qua
  const recentTimestamps = timestamps.filter((t) => now - t < timeframeMs);

  if (recentTimestamps.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Vui long thu lai sau 1 phut.",
    });
  }

  recentTimestamps.push(now);
  ipRequestTimes.set(ip, recentTimestamps);
  next();
};

module.exports = rateLimiter;

const jwt = require('jsonwebtoken')

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization

  const token =
    authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : req.cookies?.token

  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev_secret_key',
    )

    req.user = decoded
    req.user_id = decoded.user_id
    req.role_id = decoded.role_id
    req.role = decoded.role
  } catch {
    // Token hết hạn hoặc sai thì coi như guest.
    req.user = null
    req.user_id = null
  }

  return next()
}

module.exports = optionalAuth
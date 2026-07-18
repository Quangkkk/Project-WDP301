import axios from 'axios'
import { getAccessToken } from '../utils/authStorage'

// Lay API Base URL tu file cau hinh .env hoac mac dinh port 8080
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

// Khoi tao instance Axios voi cau hinh mac dinh
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Axios request interceptor: tu dong lay token tu localStorage/sessionStorage
// va gan vao header Authorization (Bearer token) cho cac request can xac thuc
api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

const exactErrorMap = {
  'invalid email or password': 'Email hoặc mật khẩu không đúng.',
  'email or password is incorrect': 'Email hoặc mật khẩu không đúng.',
  'account has been blocked': 'Tài khoản đã bị khóa.',
  'account has not been verified': 'Tài khoản chưa được xác thực.',
  'email and password are required': 'Vui lòng nhập email và mật khẩu.',
  'name, email and password are required': 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.',
  'email already exists': 'Email này đã được sử dụng.',
  'failed to login': 'Đăng nhập thất bại.',
  'failed to register': 'Đăng ký thất bại.',
  'user not found': 'Không tìm thấy người dùng.',
  'email is required': 'Vui lòng nhập email.',
  'password is required': 'Vui lòng nhập mật khẩu.',
  'password must be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự.',
  'passwords do not match': 'Mật khẩu xác nhận không khớp.',
  'reset token is required': 'Thiếu mã đặt lại mật khẩu.',
  'reset password token is invalid or has expired': 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  'order not found': 'Không tìm thấy đơn hàng.',
  'failed to create order': 'Không tạo được đơn hàng.',
  'failed to get orders': 'Không tải được danh sách đơn hàng.',
  'failed to cancel order': 'Không hủy được đơn hàng.',
  'coupon not found': 'Mã giảm giá không tồn tại.',
  'coupon has expired': 'Mã giảm giá đã hết hạn.',
  'cart is empty': 'Giỏ hàng đang trống.',
  'not enough stock': 'Số lượng tồn kho không đủ.',
}

const partialErrorMap = [
  {
    keyword: 'minimum order amount is',
    message: 'Đơn hàng chưa đạt giá trị tối thiểu để dùng mã giảm giá.',
  },
  {
    keyword: 'not enough stock',
    message: 'Số lượng tồn kho không đủ.',
  },
  {
    keyword: 'invalid payment_status',
    message: 'Trạng thái thanh toán không hợp lệ.',
  },
  {
    keyword: 'invalid order status',
    message: 'Trạng thái đơn hàng không hợp lệ.',
  },
]

export const translateErrorMessage = (
  message,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
) => {
  const rawMessage = String(message || '').trim()

  if (!rawMessage) {
    return fallback
  }

  const normalized = rawMessage.toLowerCase()

  if (exactErrorMap[normalized]) {
    return exactErrorMap[normalized]
  }

  const partialMatch = partialErrorMap.find((item) =>
    normalized.includes(item.keyword),
  )

  if (partialMatch) {
    return partialMatch.message
  }

  return rawMessage || fallback
}

export const getErrorMessage = (
  error,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
) => {
  const rawMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback

  return translateErrorMessage(rawMessage, fallback)
}

export default api
import axios from 'axios'
import { getAccessToken } from '../utils/authStorage'

// Lấy địa chỉ API từ file .env, mặc định dùng backend local ở cổng 8080.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // De trinh duyet tu them multipart boundary khi upload FormData.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

const exactMessageMap = {
  // Xác thực và tài khoản
  'invalid email or password': 'Email hoặc mật khẩu không đúng.',
  'email or password is incorrect': 'Email hoặc mật khẩu không đúng.',
  'account has been blocked': 'Tài khoản đã bị khóa.',
  'account has not been verified': 'Tài khoản chưa được xác thực.',
  'email and password are required': 'Vui lòng nhập email và mật khẩu.',
  'name, email and password are required': 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu.',
  'email already exists': 'Email này đã được sử dụng.',
  'email is required': 'Vui lòng nhập email.',
  'password is required': 'Vui lòng nhập mật khẩu.',
  'password must be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự.',
  'passwords do not match': 'Mật khẩu xác nhận không khớp.',
  'password and confirm password are required': 'Vui lòng nhập mật khẩu và mật khẩu xác nhận.',
  'reset token is required': 'Thiếu mã đặt lại mật khẩu.',
  'reset password token is invalid or has expired': 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  'invalid or expired otp code': 'Mã OTP không hợp lệ hoặc đã hết hạn.',
  'email and otp are required': 'Vui lòng nhập email và mã OTP.',
  'user not found': 'Không tìm thấy người dùng.',
  'role not found': 'Không tìm thấy vai trò.',
  'staff not found': 'Không tìm thấy nhân viên.',
  'customer not found': 'Không tìm thấy khách hàng.',
  'login successfully': 'Đăng nhập thành công.',
  'verify email successfully': 'Xác thực email thành công.',
  'register successfully. please verify your email.': 'Đăng ký thành công. Vui lòng xác thực email.',

  // Quyền truy cập
  unauthorized: 'Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.',
  'invalid token': 'Phiên đăng nhập không hợp lệ.',
  'access denied': 'Bạn không có quyền thực hiện thao tác này.',
  'access denied. user role is missing.': 'Tài khoản chưa được gán vai trò.',
  'access denied. you do not have permission.': 'Bạn không có quyền thực hiện thao tác này.',
  'unauthorized or invalid user token': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',

  // Đơn hàng và thanh toán
  'order not found': 'Không tìm thấy đơn hàng.',
  'order not found or does not belong to you': 'Không tìm thấy đơn hàng hoặc đơn hàng không thuộc tài khoản của bạn.',
  'cart not found': 'Không tìm thấy giỏ hàng.',
  'cart is empty': 'Giỏ hàng đang trống.',
  'this order cannot be cancelled': 'Đơn hàng này không thể hủy.',
  'order was already changed or cancelled': 'Đơn hàng đã được thay đổi hoặc đã bị hủy.',
  'cancel reason is required when cancelled by staff': 'Nhân viên phải nhập lý do hủy đơn.',
  'paid order cannot be cancelled directly. process a refund first.': 'Đơn đã thanh toán không thể hủy trực tiếp. Vui lòng xử lý hoàn tiền trước.',
  'cancelled order cannot be marked as paid': 'Không thể xác nhận thanh toán cho đơn hàng đã hủy.',
  'cancelled order cannot create a payment': 'Không thể tạo thanh toán cho đơn hàng đã hủy.',
  'order is already paid': 'Đơn hàng đã được thanh toán.',
  'online payment must be paid before completing the order': 'Đơn thanh toán trực tuyến phải được thanh toán trước khi hoàn thành.',
  'completed or cancelled orders cannot be changed': 'Không thể thay đổi đơn đã hoàn thành hoặc đã hủy.',
  'use the cancel order endpoint to cancel an order': 'Vui lòng sử dụng chức năng hủy đơn hàng.',
  'payment transaction not found': 'Không tìm thấy giao dịch thanh toán.',
  'bank transfer payment transaction not found': 'Không tìm thấy giao dịch chuyển khoản ngân hàng.',
  'invalid payment method': 'Phương thức thanh toán không hợp lệ.',
  'invalid mac': 'Chữ ký xác thực thanh toán không hợp lệ.',
  'invalid app_id': 'Mã ứng dụng ZaloPay không hợp lệ.',

  // Sản phẩm, tồn kho và giỏ hàng
  'product not found': 'Không tìm thấy sản phẩm.',
  'product variant not found': 'Không tìm thấy phiên bản sản phẩm.',
  'variant not found or does not belong to product': 'Không tìm thấy phiên bản hoặc phiên bản không thuộc sản phẩm này.',
  'variant price is invalid': 'Giá phiên bản sản phẩm không hợp lệ.',
  'not enough stock': 'Số lượng tồn kho không đủ.',
  'not enough stock while creating order': 'Tồn kho không đủ để tạo đơn hàng.',
  'item quantity must be greater than 0': 'Số lượng sản phẩm phải lớn hơn 0.',
  'valid variant_id is required for every order item': 'Mỗi sản phẩm trong đơn hàng phải có phiên bản hợp lệ.',
  'product sku already exists': 'Mã SKU sản phẩm đã tồn tại.',
  'wishlist item not found': 'Không tìm thấy sản phẩm trong danh sách yêu thích.',
  'product already exists in wishlist': 'Sản phẩm đã có trong danh sách yêu thích.',
  'brand not found': 'Không tìm thấy thương hiệu.',
  'category not found': 'Không tìm thấy danh mục.',

  // Mã giảm giá
  'coupon not found': 'Mã giảm giá không tồn tại.',
  'coupon has expired': 'Mã giảm giá đã hết hạn.',
  'coupon has not started yet': 'Mã giảm giá chưa đến thời gian sử dụng.',
  'coupon usage limit reached': 'Mã giảm giá đã đạt giới hạn sử dụng.',
  'user coupon usage limit reached': 'Bạn đã đạt giới hạn sử dụng mã giảm giá này.',
  'coupon has usage history and cannot be deleted': 'Mã giảm giá đã có lịch sử sử dụng nên không thể xóa.',

  // Đánh giá, hỗ trợ và trò chuyện
  'review not found': 'Không tìm thấy đánh giá.',
  'rating must be between 1 and 5': 'Điểm đánh giá phải từ 1 đến 5.',
  'support ticket not found': 'Không tìm thấy yêu cầu hỗ trợ.',
  'conversation not found': 'Không tìm thấy cuộc trò chuyện.',
  'conversation is closed': 'Cuộc trò chuyện đã đóng.',
  'message content cannot be empty': 'Nội dung tin nhắn không được để trống.',
  'subject is required': 'Vui lòng nhập tiêu đề yêu cầu hỗ trợ.',

  // Địa chỉ và dữ liệu chung
  'address not found': 'Không tìm thấy địa chỉ.',
  'missing address required fields': 'Vui lòng nhập đầy đủ thông tin địa chỉ.',
  'missing receiver/address information': 'Vui lòng nhập đầy đủ người nhận và địa chỉ giao hàng.',
  'no data to update': 'Không có dữ liệu cần cập nhật.',
  'api endpoint not found': 'Không tìm thấy API được yêu cầu.',

  // Các thông báo tiếng Việt cũ chưa có dấu
  'khong du hang trong kho': 'Không đủ hàng trong kho.',
  'khong tai duoc gio hang': 'Không tải được giỏ hàng.',
  'khong tim thay gio hang': 'Không tìm thấy giỏ hàng.',
  'khong tim thay phien ban san pham': 'Không tìm thấy phiên bản sản phẩm.',
  'khong tim thay san pham': 'Không tìm thấy sản phẩm.',
  'khong tim thay san pham trong gio hang': 'Không tìm thấy sản phẩm trong giỏ hàng.',
  'khong xoa duoc gio hang': 'Không xóa được giỏ hàng.',
  'so luong phai lon hon 0': 'Số lượng phải lớn hơn 0.',
  'vui long chon phien ban san pham': 'Vui lòng chọn phiên bản sản phẩm.',
  'san pham dang ngung ban': 'Sản phẩm đang ngừng bán.',
  'phien ban san pham dang ngung ban': 'Phiên bản sản phẩm đang ngừng bán.',
  'da cap nhat gio hang': 'Đã cập nhật giỏ hàng.',
  'da them san pham vao gio hang': 'Đã thêm sản phẩm vào giỏ hàng.',
  'da xoa san pham khoi gio hang': 'Đã xóa sản phẩm khỏi giỏ hàng.',
  'da xoa toan bo gio hang': 'Đã xóa toàn bộ giỏ hàng.',
  'ban chi duoc danh gia san pham tu don hang da hoan thanh (completed)': 'Bạn chỉ được đánh giá sản phẩm từ đơn hàng đã hoàn thành.',
  'ban da danh gia san pham nay trong don hang nay roi': 'Bạn đã đánh giá sản phẩm này trong đơn hàng này.',
  'ban khong co quyen sua review cua nguoi khac': 'Bạn không có quyền sửa đánh giá của người khác.',
  'san pham khong co trong don hang nay': 'Sản phẩm không có trong đơn hàng này.',
  'ly do an review (hidden_reason) la bat buoc': 'Vui lòng nhập lý do ẩn đánh giá.',
  'cart item id khong hop le': 'Mã sản phẩm trong giỏ hàng không hợp lệ.',
  'product_id khong hop le': 'Mã sản phẩm không hợp lệ.',
  'variant_id khong hop le': 'Mã phiên bản sản phẩm không hợp lệ.',
  'too many requests. vui long thu lai sau 1 phut.': 'Bạn thao tác quá nhiều lần. Vui lòng thử lại sau 1 phút.',
}

const partialMessageRules = [
  ['minimum order amount is', 'Đơn hàng chưa đạt giá trị tối thiểu để sử dụng mã giảm giá.'],
  ['not enough stock for', 'Số lượng tồn kho không đủ cho sản phẩm đã chọn.'],
  ['product ', 'Sản phẩm không hợp lệ hoặc đang ngừng bán.'],
  ['variant ', 'Phiên bản sản phẩm không hợp lệ hoặc đang ngừng bán.'],
  ['invalid payment_status', 'Trạng thái thanh toán không hợp lệ.'],
  ['invalid order status', 'Trạng thái đơn hàng không hợp lệ.'],
  ['invalid ', 'Dữ liệu gửi lên không hợp lệ.'],
  ['valid ', 'Vui lòng cung cấp dữ liệu hợp lệ.'],
  ['required', 'Vui lòng nhập đầy đủ thông tin bắt buộc.'],
  ['missing zalopay', 'Thiếu cấu hình ZaloPay trên máy chủ.'],
  ['must be greater than 0', 'Giá trị phải lớn hơn 0.'],
  ['does not match', 'Thông tin xác nhận không khớp.'],
  ['already exists', 'Dữ liệu này đã tồn tại.'],
  ['already', 'Thao tác này đã được thực hiện trước đó.'],
  ['not found', 'Không tìm thấy dữ liệu yêu cầu.'],
  ['failed to', 'Không thể thực hiện thao tác. Vui lòng thử lại.'],
  ['cannot be', 'Không thể thực hiện thao tác này.'],
  ['unauthorized', 'Bạn không có quyền thực hiện thao tác này.'],
  ['access denied', 'Bạn không có quyền thực hiện thao tác này.'],
]

const hasVietnameseCharacters = (value) =>
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(value)

const looksLikeEnglishMessage = (value) => {
  const words = String(value || '').match(/[A-Za-z]{2,}/g) || []
  return words.length >= 2 && !hasVietnameseCharacters(value)
}

export const translateErrorMessage = (
  message,
  fallback = 'Có lỗi xảy ra. Vui lòng thử lại.',
  { success = false } = {},
) => {
  const rawMessage = String(message || '').trim()

  if (!rawMessage) {
    return success ? 'Thao tác thành công.' : fallback
  }

  const normalized = rawMessage.toLowerCase()

  if (exactMessageMap[normalized]) {
    return exactMessageMap[normalized]
  }

  if (hasVietnameseCharacters(rawMessage)) {
    return rawMessage
  }

  if (success && looksLikeEnglishMessage(rawMessage)) {
    return 'Thao tác thành công.'
  }

  const partialMatch = partialMessageRules.find(([keyword]) =>
    normalized.includes(keyword),
  )

  if (partialMatch) {
    return partialMatch[1]
  }

  // Không để thông báo tiếng Anh chưa được dịch xuất hiện trên giao diện.
  if (looksLikeEnglishMessage(rawMessage)) {
    return success ? 'Thao tác thành công.' : fallback
  }

  return rawMessage || (success ? 'Thao tác thành công.' : fallback)
}

const translateResponsePayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload
  }

  const isSuccess = payload.success === true || payload.return_code === 1

  if (typeof payload.message === 'string') {
    payload.message = translateErrorMessage(
      payload.message,
      isSuccess ? 'Thao tác thành công.' : 'Có lỗi xảy ra. Vui lòng thử lại.',
      { success: isSuccess },
    )
  }

  if (typeof payload.error === 'string') {
    payload.error = translateErrorMessage(payload.error)
  }

  if (typeof payload.return_message === 'string') {
    payload.return_message = translateErrorMessage(
      payload.return_message,
      isSuccess ? 'Thành công.' : 'Xử lý thanh toán thất bại.',
      { success: isSuccess },
    )
  }

  return payload
}

api.interceptors.response.use(
  (response) => {
    response.data = translateResponsePayload(response.data)
    return response
  },
  (error) => {
    if (error?.response?.data) {
      error.response.data = translateResponsePayload(error.response.data)
    }

    return Promise.reject(error)
  },
)

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
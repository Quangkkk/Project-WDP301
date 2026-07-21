import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'

import { API_BASE_URL, getErrorMessage } from '../../services/api'
import { trackOrder } from '../../services/order.service'
import {
  formatDate,
  formatOrderCode,
  getId,
} from '../../utils/format'

const getGuestLookupStorageKey = (orderId) =>
  `guest_order_lookup_${orderId}`

function getOrderStatusLabel(status) {
  const labels = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao hàng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  }

  return labels[status] || status || 'Không xác định'
}

function getPaymentStatusLabel(status) {
  const labels = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thanh toán thất bại',
    refunded: 'Đã hoàn tiền',
    cancelled: 'Đã hủy',
  }

  return labels[status] || status || 'Không xác định'
}

function getPaymentMethodLabel(method) {
  const labels = {
    cod: 'Thanh toán khi nhận hàng',
    bank_transfer: 'Chuyển khoản ngân hàng / VietQR',
    zalopay: 'ZaloPay Sandbox',
  }

  return labels[method] || method || '-'
}

function getStatusClass(status) {
  const classes = {
    pending: 'bg-orange-50 text-orange-700',
    confirmed: 'bg-blue-50 text-blue-700',
    processing: 'bg-amber-50 text-amber-700',
    shipping: 'bg-indigo-50 text-indigo-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
    unpaid: 'bg-slate-100 text-slate-600',
    paid: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    refunded: 'bg-purple-50 text-purple-700',
  }

  return classes[status] || 'bg-slate-100 text-slate-600'
}

function StatusPill({ status, children }) {
  return (
    <span
      className={`inline-flex items-center justify-center !rounded-full px-3 py-2 text-xs font-bold ${getStatusClass(status)}`}
      style={{ minWidth: 118, whiteSpace: 'nowrap' }}
    >
      {children}
    </span>
  )
}

function normalizeTrackResult(response) {
  const payload = response?.data || response || {}

  return {
    order: payload?.order || null,
    items: Array.isArray(payload?.items) ? payload.items : [],
  }
}

function readStoredLookup(orderId) {
  try {
    const rawValue = sessionStorage.getItem(getGuestLookupStorageKey(orderId))
    return rawValue ? JSON.parse(rawValue) : null
  } catch {
    return null
  }
}

function removeStoredLookup(orderId) {
  try {
    sessionStorage.removeItem(getGuestLookupStorageKey(orderId))
  } catch {
    // Không cần xử lý thêm nếu trình duyệt chặn sessionStorage.
  }
}

function getReceiverAddress(order) {
  return [
    order?.address_address_line,
    order?.address_ward,
    order?.address_district,
    order?.address_province,
  ]
    .filter(Boolean)
    .join(', ')
}

function getProductName(item) {
  const product = item?.product_id || item?.product || {}

  if (typeof product === 'string') {
    return item?.product_name || 'Sản phẩm'
  }

  return product?.name || item?.product_name || 'Sản phẩm'
}

function getProductId(item) {
  const product = item?.product_id || item?.product || item?.productId

  if (typeof product === 'string') return product

  return getId(product) || ''
}

function getVariantText(item) {
  const variant = item?.variant_id || item?.variant || {}

  if (!variant || typeof variant === 'string') return ''

  return variant?.variant_value || variant?.sku || ''
}

function getProductImage(item) {
  const variant = item?.variant_id || item?.variant || {}
  const product = item?.product_id || item?.product || {}

  return (
    item?.image ||
    (typeof variant === 'object' ? variant?.image : '') ||
    (typeof product === 'object'
      ? product?.image || product?.thumbnail || product?.img_url
      : '') ||
    ''
  )
}

function resolveImageUrl(image) {
  const value = String(image || '').trim()

  if (!value) return ''

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  return `${API_BASE_URL}/${value.replace(/^\/+/, '')}`
}

function GuestOrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const stateOrder = location.state?.order || null
  const stateItems = Array.isArray(location.state?.items)
    ? location.state.items
    : []
  const stateLookup = location.state?.lookup || null

  const hasValidStateOrder =
    stateOrder && String(getId(stateOrder)) === String(orderId)

  const [order, setOrder] = useState(hasValidStateOrder ? stateOrder : null)
  const [items, setItems] = useState(hasValidStateOrder ? stateItems : [])
  const [isLoading, setIsLoading] = useState(!hasValidStateOrder)
  const [error, setError] = useState('')
  const [hasAccess, setHasAccess] = useState(Boolean(hasValidStateOrder))

  const receiverAddress = useMemo(() => getReceiverAddress(order), [order])

  const subtotal = Number(order?.subtotal || 0)
  const totalAmount = Number(order?.total_amount || order?.total || 0)

  const discountValue =
    order?.discount_amount ??
    order?.discountAmount ??
    order?.coupon_discount ??
    order?.couponDiscount

  const shippingValue =
    order?.shipping_fee ??
    order?.shippingFee ??
    order?.delivery_fee ??
    order?.deliveryFee

  const hasDiscount = discountValue !== undefined && discountValue !== null
  const hasShippingFee = shippingValue !== undefined && shippingValue !== null
  const discountAmount = Number(discountValue || 0)
  const shippingFee = Number(shippingValue || 0)

  useEffect(() => {
    let mounted = true

    const verifyAndLoad = async () => {
      const lookup = stateLookup || readStoredLookup(orderId)

      if (!lookup?.order_code || !lookup?.contact) {
        if (mounted) {
          setHasAccess(Boolean(hasValidStateOrder))
          setIsLoading(false)
        }
        return
      }

      // Vừa được điều hướng từ modal thì đã có dữ liệu xác minh, không gọi API lần hai.
      if (hasValidStateOrder && stateLookup) {
        try {
          sessionStorage.setItem(
            getGuestLookupStorageKey(orderId),
            JSON.stringify(stateLookup),
          )
        } catch {
          // location.state vẫn đủ để hiển thị trong lần điều hướng hiện tại.
        }

        if (mounted) {
          setHasAccess(true)
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)
        setError('')

        const response = await trackOrder({
          order_code: lookup.order_code,
          contact: lookup.contact,
        })

        const payload = normalizeTrackResult(response)
        const loadedOrderId = getId(payload.order)

        if (!payload.order || String(loadedOrderId) !== String(orderId)) {
          throw new Error('Thông tin xác minh không thuộc đơn hàng này.')
        }

        if (!mounted) return

        setOrder(payload.order)
        setItems(payload.items)
        setHasAccess(true)
      } catch (err) {
        if (!mounted) return

        removeStoredLookup(orderId)
        setOrder(null)
        setItems([])
        setHasAccess(false)
        setError(
          getErrorMessage(
            err,
            'Phiên tra cứu không còn hợp lệ. Vui lòng tra cứu lại đơn hàng.',
          ),
        )
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    verifyAndLoad()

    return () => {
      mounted = false
    }
  }, [orderId])

  const handleTrackAnotherOrder = () => {
    removeStoredLookup(orderId)
    navigate('/', { replace: true })
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <div className='mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3'>
            <div>
              <p className='mb-1 text-xs font-black uppercase tracking-[0.24em] text-orange-600'>
                Tra cứu đơn hàng
              </p>

              <h1 className='mb-1 text-3xl font-black text-slate-950'>
                Chi tiết đơn hàng {order ? formatOrderCode(order) : ''}
              </h1>

              <p className='mb-0 text-sm text-slate-500'>
                Trang này chỉ hiển thị sau khi mã đơn và thông tin liên hệ đã
                được xác minh.
              </p>
            </div>

            <div className='d-flex flex-wrap gap-2'>
              <Button variant='outline' onClick={() => navigate('/products')}>
                Tiếp tục mua sắm
              </Button>

              <Button variant='secondary' onClick={handleTrackAnotherOrder}>
                Tra cứu đơn khác
              </Button>
            </div>
          </div>

          <Alert type='danger' className='mb-4'>
            {error}
          </Alert>

          {isLoading ? (
            <LoadingText />
          ) : !hasAccess || !order ? (
            <EmptyState
              icon='🔐'
              title='Bạn chưa xác minh đơn hàng này'
              description='Hãy mở chức năng Tra cứu đơn hàng trên đầu trang, sau đó nhập đúng mã đơn cùng email hoặc số điện thoại đã dùng khi đặt hàng.'
              actionLabel='Về trang chủ'
              onAction={() => navigate('/', { replace: true })}
            />
          ) : (
            <Row className='g-4 align-items-start'>
              <Col lg={8}>
                <Card className='card-surface mb-4 overflow-hidden'>
                  <div className='bg-orange-500' style={{ height: 4 }} />

                  <Card.Body className='p-4'>
                    <div className='mb-4 d-flex flex-wrap align-items-start justify-content-between gap-3'>
                      <div>
                        <p className='mb-1 text-sm text-slate-500'>
                          Đơn hàng được tạo vào
                        </p>

                        <p className='mb-0 text-xl font-semibold text-slate-900'>
                          {formatDate(order.created_at)}
                        </p>
                      </div>

                      <div className='d-flex flex-wrap gap-2'>
                        <StatusPill status={order.status}>
                          {getOrderStatusLabel(order.status)}
                        </StatusPill>

                        <StatusPill status={order.payment_status}>
                          {getPaymentStatusLabel(order.payment_status)}
                        </StatusPill>
                      </div>
                    </div>

                    <Row className='g-3'>
                      <Col md={5}>
                        <div className='h-100 !rounded-4 border border-slate-100 bg-slate-50 p-3'>
                          <p className='mb-1 text-xs font-black uppercase text-slate-400'>
                            Người nhận
                          </p>

                          <p className='mb-1 text-base font-semibold text-slate-900'>
                            {order.receiver_name || '-'}
                          </p>

                          <p className='mb-1 text-sm text-slate-500'>
                            {order.receiver_phone || '-'}
                          </p>

                          <p className='mb-0 break-all text-sm text-slate-500'>
                            {order.receiver_email || '-'}
                          </p>
                        </div>
                      </Col>

                      <Col md={7}>
                        <div className='h-100 !rounded-4 border border-slate-100 bg-slate-50 p-3'>
                          <p className='mb-1 text-xs font-black uppercase text-slate-400'>
                            Địa chỉ nhận hàng
                          </p>

                          <p className='mb-0 text-sm leading-7 text-slate-700'>
                            {receiverAddress || '-'}
                          </p>
                        </div>
                      </Col>
                    </Row>

                    {order.note && (
                      <div className='mt-3 !rounded-4 border border-slate-100 bg-white p-3'>
                        <p className='mb-1 text-xs font-black uppercase text-slate-400'>
                          Ghi chú
                        </p>
                        <p className='mb-0 text-sm text-slate-700'>{order.note}</p>
                      </div>
                    )}

                    {order.cancel_reason && (
                      <Alert type='warning' className='mt-3'>
                        Lý do hủy: {order.cancel_reason}
                      </Alert>
                    )}
                  </Card.Body>
                </Card>

                <Card className='card-surface overflow-hidden'>
                  <Card.Body className='p-0'>
                    <div className='border-bottom px-4 py-4'>
                      <h2 className='mb-0 text-2xl font-semibold text-slate-950'>
                        Sản phẩm đã đặt
                      </h2>
                    </div>

                    {items.length === 0 ? (
                      <div className='p-4 text-center text-slate-500'>
                        Chưa có sản phẩm trong đơn hàng.
                      </div>
                    ) : (
                      items.map((item) => {
                        const productId = getProductId(item)
                        const productName = getProductName(item)
                        const variantText = getVariantText(item)
                        const imageUrl = resolveImageUrl(getProductImage(item))
                        const quantity = Math.max(Number(item.quantity || 1), 1)
                        const unitPrice = Number(item.unit_price || item.price || 0)
                        const lineTotal = Number(
                          item.subtotal || unitPrice * quantity,
                        )

                        return (
                          <div
                            key={getId(item) || `${productName}-${variantText}`}
                            className='border-bottom px-4 py-4'
                          >
                            <Row className='g-3 align-items-center'>
                              <Col md={7}>
                                <div className='d-flex align-items-center gap-3'>
                                  <div
                                    className='d-flex align-items-center justify-content-center overflow-hidden !rounded-4 bg-slate-100'
                                    style={{
                                      width: 76,
                                      height: 76,
                                      minWidth: 76,
                                    }}
                                  >
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={productName}
                                        className='h-100 w-100 object-cover'
                                      />
                                    ) : (
                                      <span className='text-2xl'>📦</span>
                                    )}
                                  </div>

                                  <div className='min-w-0'>
                                    {productId ? (
                                      <button
                                        type='button'
                                        onClick={() =>
                                          navigate(`/products/${productId}`)
                                        }
                                        className='border-0 bg-transparent p-0 text-start font-bold text-slate-950 hover:text-orange-600'
                                      >
                                        {productName}
                                      </button>
                                    ) : (
                                      <p className='mb-0 font-bold text-slate-950'>
                                        {productName}
                                      </p>
                                    )}

                                    {variantText && (
                                      <p className='mb-0 mt-1 text-sm text-slate-500'>
                                        Phân loại: {variantText}
                                      </p>
                                    )}

                                    <p className='mb-0 mt-1 text-sm text-slate-500'>
                                      Số lượng: {quantity}
                                    </p>
                                  </div>
                                </div>
                              </Col>

                              <Col md={5}>
                                <div className='d-flex flex-column align-items-md-end gap-1'>
                                  <PriceText
                                    value={unitPrice}
                                    className='text-sm text-slate-500'
                                  />
                                  <PriceText
                                    value={lineTotal}
                                    className='text-lg font-black text-orange-600'
                                  />
                                </div>
                              </Col>
                            </Row>
                          </div>
                        )
                      })
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card
                  className='card-surface position-sticky'
                  style={{ top: 132, zIndex: 10 }}
                >
                  <Card.Body className='p-4'>
                    <h2 className='mb-4 text-2xl font-black text-slate-950'>
                      Tóm tắt đơn hàng
                    </h2>

                    <div className='mb-3 d-flex justify-content-between gap-3'>
                      <span className='text-slate-500'>Mã đơn hàng</span>
                      <span className='text-end font-bold text-slate-900'>
                        {formatOrderCode(order)}
                      </span>
                    </div>

                    <div className='mb-3 d-flex justify-content-between gap-3'>
                      <span className='text-slate-500'>Thanh toán</span>
                      <span className='text-end font-bold text-slate-900'>
                        {getPaymentMethodLabel(order.payment_method)}
                      </span>
                    </div>

                    <div className='mb-3 d-flex justify-content-between gap-3'>
                      <span className='text-slate-500'>Tạm tính</span>
                      <PriceText value={subtotal} className='font-bold' />
                    </div>

                    {hasShippingFee && (
                      <div className='mb-3 d-flex justify-content-between gap-3'>
                        <span className='text-slate-500'>Phí giao hàng</span>
                        <PriceText value={shippingFee} className='font-bold' />
                      </div>
                    )}

                    {hasDiscount && discountAmount > 0 && (
                      <div className='mb-3 d-flex justify-content-between gap-3'>
                        <span className='text-slate-500'>Giảm giá</span>
                        <span className='font-bold text-emerald-600'>
                          -<PriceText value={discountAmount} />
                        </span>
                      </div>
                    )}

                    {order.coupon_code && (
                      <div className='mb-3 d-flex justify-content-between gap-3'>
                        <span className='text-slate-500'>Mã giảm giá</span>
                        <span className='font-bold text-orange-600'>
                          {order.coupon_code}
                        </span>
                      </div>
                    )}

                    <hr />

                    <div className='d-flex align-items-center justify-content-between gap-3'>
                      <span className='font-black text-slate-950'>Tổng cộng</span>
                      <PriceText
                        value={totalAmount}
                        className='text-2xl font-black text-orange-600'
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default GuestOrderDetailPage
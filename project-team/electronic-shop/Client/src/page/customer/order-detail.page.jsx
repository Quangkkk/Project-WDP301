import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Modal from 'react-bootstrap/Modal'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'

import { getErrorMessage } from '../../services/api'
import { cancelOrder, getOrderById } from '../../services/order.service'
import { getPaymentByOrder } from '../../services/payment.service'
import { addToWishlist } from '../../services/wishlist.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { formatDate, getId } from '../../utils/format'

function getOrderStatusLabel(status) {
    const map = {
        pending: 'Chờ xác nhận',
        confirmed: 'Đã xác nhận',
        processing: 'Đang xử lý',
        shipping: 'Đang giao',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy',
    }

    return map[status] || status || 'Không xác định'
}

function getPaymentStatusLabel(status) {
    const map = {
        unpaid: 'Chưa thanh toán',
        pending: 'Chờ thanh toán',
        paid: 'Đã thanh toán',
        failed: 'Thanh toán thất bại',
        refunded: 'Đã hoàn tiền',
        cancelled: 'Đã hủy',
    }

    return map[status] || status || 'Không xác định'
}

function getPaymentMethodLabel(method) {
    const map = {
        cod: 'Thanh toán khi nhận hàng',
        bank_transfer: 'Chuyển khoản ngân hàng',
        zalopay: 'ZaloPay Sandbox',
    }

    return map[method] || method || '-'
}

function getStatusClass(status) {
    const map = {
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

    return map[status] || 'bg-slate-100 text-slate-600'
}

function StatusPill({ children, status }) {
    return (
        <span
            className={`d-inline-flex align-items-center justify-content-center !rounded-pill px-3 py-2 text-xs font-bold ${getStatusClass(status)}`}
            style={{
                minWidth: 118,
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </span>
    )
}

function getProductName(item) {
    const product = item?.product_id || item?.product || {}

    if (typeof product === 'string') {
        return item?.product_name || 'Sản phẩm'
    }

    return product?.name || item?.product_name || 'Sản phẩm'
}

function getVariantText(item) {
    const variant = item?.variant_id || item?.variant || {}

    if (!variant || typeof variant === 'string') {
        return ''
    }

    return variant.variant_value || variant.sku || ''
}

function getProductImage(item) {
    const variant = item?.variant_id || item?.variant || {}
    const product = item?.product_id || item?.product || {}

    if (item?.image) return item.image
    if (variant && typeof variant !== 'string' && variant.image) return variant.image
    if (product && typeof product !== 'string' && product.image) return product.image
    if (product && typeof product !== 'string' && product.thumbnail) return product.thumbnail
    if (product && typeof product !== 'string' && product.img_url) return product.img_url

    return ''
}

function getProductObject(item) {
    const product = item?.product_id || item?.product || {}

    if (!product || typeof product === 'string') {
        return null
    }

    return product
}

function getProductIdFromItem(item) {
    const product = item?.product_id || item?.product || item?.productId

    if (typeof product === 'string') return product

    return getId(product) || item?.product_id || item?.productId || ''
}

function getVariantIdFromItem(item) {
    const variant = item?.variant_id || item?.variant || item?.variantId

    if (typeof variant === 'string') return variant

    return getId(variant) || item?.variant_id || item?.variantId || ''
}

function formatMoney(value) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(value || 0))
}

function buildProductChatMessage(item, order, orderId) {
    const productId = getProductIdFromItem(item)
    const productName = getProductName(item)
    const variantText = getVariantText(item)
    const quantity = Number(item.quantity || 1)
    const unitPrice = Number(item.unit_price || item.price || 0)
    const orderCode = getOrderCode(order, orderId)

    return [
        `Shop ơi, tôi muốn hỏi về sản phẩm trong đơn ${orderCode}:`,
        `Sản phẩm: ${productName}`,
        variantText ? `Phân loại: ${variantText}` : '',
        `Số lượng: ${quantity}`,
        `Đơn giá: ${formatMoney(unitPrice)}`,
        productId ? `Link sản phẩm: ${window.location.origin}/products/${productId}` : '',
    ]
        .filter(Boolean)
        .join('\n')
}

function getOrderCode(order, orderId) {
    const id = getId(order) || orderId || ''
    return id ? `#${id.slice(-8).toUpperCase()}` : '-'
}

function canCancelOrder(order) {
    return ['pending', 'confirmed', 'processing'].includes(order?.status)
}

function getReceiverAddress(order) {
    if (!order) return ''

    return [
        order.address_address_line,
        order.address_ward,
        order.address_district,
        order.address_province,
    ]
        .filter(Boolean)
        .join(', ')
}

function normalizeOrderPayload(response) {
    const data = response?.data || response || {}

    return {
        order: data.order || data,
        items: Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.order_items)
                ? data.order_items
                : Array.isArray(data.order?.items)
                    ? data.order.items
                    : [],
    }
}

function OrderDetailPage() {
    const { orderId } = useParams()
    const navigate = useNavigate()
    const currentUser = getCurrentUser()
    const currentUserId = getUserId(currentUser)
    const [order, setOrder] = useState(null)
    const [items, setItems] = useState([])
    const [payment, setPayment] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadingAction, setLoadingAction] = useState('')
    const [wishlistLoadingId, setWishlistLoadingId] = useState('')
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const receiverAddress = useMemo(() => getReceiverAddress(order), [order])

    const subtotal = Number(order?.subtotal || order?.sub_total || 0)
    const totalAmount = Number(order?.total_amount || order?.totalAmount || order?.total || 0)

    const rawDiscount =
        order?.discount_amount ??
        order?.discountAmount ??
        order?.coupon_discount ??
        order?.couponDiscount ??
        order?.voucher_discount ??
        order?.voucherDiscount ??
        order?.discount

    const discountAmount = Number(rawDiscount || 0)

    const rawShippingFee =
        order?.shipping_fee ??
        order?.shippingFee ??
        order?.delivery_fee ??
        order?.deliveryFee

    const shippingFee =
        rawShippingFee !== undefined && rawShippingFee !== null
            ? Number(rawShippingFee || 0)
            : Math.max(totalAmount + discountAmount - subtotal, 0)

    const loadDetail = async () => {
        try {
            setIsLoading(true)
            setError('')

            const response = await getOrderById(orderId)
            const payload = normalizeOrderPayload(response)

            setOrder(payload.order || null)
            setItems(payload.items || [])

            try {
                const paymentResponse = await getPaymentByOrder(orderId)
                setPayment(paymentResponse?.data?.payment || null)
            } catch {
                setPayment(null)
            }
        } catch (error) {
            setError(getErrorMessage(error, 'Không tải được chi tiết đơn hàng.'))
            setOrder(null)
            setItems([])
            setPayment(null)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (orderId) {
            loadDetail()
        }
    }, [orderId])

    const handleOpenCancelModal = () => {
        setError('')
        setMessage('')
        setIsCancelModalOpen(true)
    }

    const handleCloseCancelModal = () => {
        if (loadingAction) return
        setIsCancelModalOpen(false)
    }

    const handleConfirmCancel = async () => {
        try {
            setLoadingAction('cancel')
            setError('')
            setMessage('')

            await cancelOrder(orderId)

            setIsCancelModalOpen(false)
            setMessage('Đã hủy đơn hàng thành công.')
            await loadDetail()
        } catch (error) {
            setError(getErrorMessage(error, 'Không hủy được đơn hàng.'))
        } finally {
            setLoadingAction('')
        }
    }

    const handleAddToWishlist = async (item) => {
  const productId = getProductIdFromItem(item)

  if (!currentUserId) {
    setError('Vui lòng đăng nhập để thêm sản phẩm vào yêu thích.')
    return
  }

  if (!productId) {
    setError('Không tìm thấy sản phẩm để thêm vào yêu thích.')
    return
  }

  try {
    setWishlistLoadingId(productId)
    setError('')
    setMessage('')

    await addToWishlist({
      user_id: currentUserId,
      product_id: productId,
    })

    setMessage('Đã thêm sản phẩm vào yêu thích.')
  } catch (error) {
    const rawMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      ''

    if (
      String(rawMessage).toLowerCase().includes('duplicate') ||
      String(rawMessage).toLowerCase().includes('already')
    ) {
      setMessage('Sản phẩm đã có trong danh sách yêu thích.')
      return
    }

    setError(getErrorMessage(error, 'Không thêm được sản phẩm vào yêu thích.'))
  } finally {
    setWishlistLoadingId('')
  }
}

const handleChatWithShop = (item) => {
  const chatMessage = buildProductChatMessage(item, order, orderId)

  navigate('/chat', {
    state: {
      autoSendMessage: true,
      prefillMessage: chatMessage,
      source: 'order-detail',
      orderId,
      productId: getProductIdFromItem(item),
      variantId: getVariantIdFromItem(item),
    },
  })
}

    return (
        <MainLayout>
            <section className='page-section'>
                <Container>
                    <div className='mb-4'>
                        <button
                            type='button'
                            onClick={() => navigate('/orders')}
                            className='mb-3 d-inline-flex align-items-center gap-2 !rounded-pill border bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
                        >
                            <i className='bi bi-arrow-left' />
                            Quay lại
                        </button>

                        <div className='d-flex flex-wrap align-items-end justify-content-between gap-3'>
                            <div>
                                <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                                    Chi tiết đơn hàng
                                </p>

                                <h1 className='mb-0 text-3xl font-normal text-slate-900'>
                                    {getOrderCode(order, orderId)}
                                </h1>
                            </div>

                            {order && (
                                <div className='d-flex flex-wrap gap-2'>
                                    <StatusPill status={order.status}>
                                        {getOrderStatusLabel(order.status)}
                                    </StatusPill>

                                    <StatusPill status={order.payment_status}>
                                        {getPaymentStatusLabel(order.payment_status)}
                                    </StatusPill>
                                </div>
                            )}
                        </div>
                    </div>

                    <Alert type='danger'>{error}</Alert>
                    <Alert type='success'>{message}</Alert>

                    {isLoading ? (
                        <LoadingText />
                    ) : !order ? (
                        <EmptyState
                            icon='📦'
                            title='Không tìm thấy đơn hàng'
                            description='Đơn hàng không tồn tại hoặc đã bị xóa.'
                            actionLabel='Quay lại đơn hàng'
                            onAction={() => navigate('/orders')}
                        />
                    ) : (
                        <Row className='g-4 align-items-start'>
                            <Col lg={7}>
                                <Card className='card-surface mb-4 overflow-hidden'>
                                    <div
                                        className='bg-orange-500'
                                        style={{
                                            height: 4,
                                        }}
                                    />

                                    <Card.Body className='p-4'>
                                        <div className='mb-4'>
                                            <p className='mb-1 text-sm text-slate-500'>
                                                Đơn hàng được tạo vào
                                            </p>

                                            <p className='mb-0 text-xl font-semibold text-slate-900'>
                                                {formatDate(order.created_at)}
                                            </p>
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

                                                    <p className='mb-0 text-sm text-slate-500'>
                                                        {order.receiver_phone || '-'}
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
                                    </Card.Body>
                                </Card>

                                <Card className='card-surface overflow-hidden'>
                                    <Card.Body className='p-0'>
                                        <div className='border-bottom px-4 py-4'>
                                            <h2 className='mb-0 text-2xl font-semibold text-slate-950'>
                                                Sản phẩm đã đặt
                                            </h2>
                                        </div>

                                        <div className='d-flex flex-column'>
                                            {items.length === 0 ? (
                                                <div className='p-4 text-center text-slate-500'>
                                                    Chưa có sản phẩm trong đơn hàng.
                                                </div>
                                            ) : (
                                                items.map((item) => {
                                                    const image = getProductImage(item)
                                                    const variantText = getVariantText(item)
                                                    const quantity = Number(item.quantity || 1)
                                                    const unitPrice = Number(item.unit_price || item.price || 0)
                                                    const lineTotal = Number(item.subtotal || unitPrice * quantity)

                                                    return (
                                                        <div
                                                            key={getId(item) || `${getProductName(item)}-${variantText}`}
                                                            className='border-bottom px-4 py-4'
                                                        >
                                                            <Row className='g-3 align-items-center'>
                                                                <Col md={6}>
                                                                    <div className='d-flex align-items-center gap-3'>
                                                                        <div
                                                                            className='d-flex align-items-center justify-content-center overflow-hidden !rounded-4 bg-slate-100'
                                                                            style={{
                                                                                width: 76,
                                                                                height: 76,
                                                                                minWidth: 76,
                                                                            }}
                                                                        >
                                                                            {image ? (
                                                                                <img
                                                                                    src={image}
                                                                                    alt={getProductName(item)}
                                                                                    className='h-100 w-100 object-fit-cover'
                                                                                />
                                                                            ) : (
                                                                                <span className='text-2xl'>📦</span>
                                                                            )}
                                                                        </div>

                                                                        <div>
                                                                            <p className='mb-1 text-base font-normal text-slate-800'>
                                                                                {getProductName(item)}
                                                                            </p>

                                                                            {variantText && (
                                                                                <p className='mb-0 text-sm text-slate-500'>
                                                                                    {variantText}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </Col>

                                                                <Col md={2} className='text-md-center'>
                                                                    <p className='mb-1 d-md-none text-xs font-black uppercase text-slate-400'>
                                                                        Số lượng
                                                                    </p>

                                                                    <span className='text-sm font-semibold text-slate-700'>
                                                                        x {quantity}
                                                                    </span>
                                                                </Col>

                                                                <Col md={2} className='text-md-end'>
                                                                    <p className='mb-1 d-md-none text-xs font-black uppercase text-slate-400'>
                                                                        Đơn giá
                                                                    </p>

                                                                    <PriceText
                                                                        value={unitPrice}
                                                                        className='text-sm font-semibold text-slate-700'
                                                                    />
                                                                </Col>

                                                                <Col md={2} className='text-md-end'>
                                                                    <p className='mb-1 d-md-none text-xs font-black uppercase text-slate-400'>
                                                                        Thành tiền
                                                                    </p>

                                                                    <PriceText
                                                                        value={lineTotal}
                                                                        className='font-semibold text-orange-600'
                                                                    />
                                                                </Col>
                                                            </Row>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col lg={5}>
                                <Card
                                    className='card-surface position-sticky overflow-hidden'
                                    style={{
                                        top: 120,
                                        zIndex: 10,
                                    }}
                                >
                                    <div
                                        className='bg-orange-500'
                                        style={{
                                            height: 4,
                                        }}
                                    />

                                    <Card.Body className='p-4'>
                                        <h2 className='mb-4 text-2xl font-semibold text-slate-950'>
                                            Thanh toán
                                        </h2>

                                        <div className='mb-3 d-flex justify-content-between gap-3'>
                                            <span className='text-slate-500'>Phương thức thanh toán</span>

                                            <span className='text-end font-semibold text-slate-900'>
                                                {getPaymentMethodLabel(order.payment_method)}
                                            </span>
                                        </div>

                                        <div className='mb-3 d-flex align-items-center justify-content-between gap-3'>
                                            <span className='text-slate-500'>Trạng thái thanh toán</span>

                                            <StatusPill status={order.payment_status}>
                                                {getPaymentStatusLabel(order.payment_status)}
                                            </StatusPill>
                                        </div>

                                        <div className='mb-3 d-flex justify-content-between gap-3'>
                                            <span className='text-slate-500'>Tạm tính</span>

                                            <PriceText
                                                value={subtotal || totalAmount}
                                                className='font-semibold'
                                            />
                                        </div>

                                        <div className='mb-3 d-flex justify-content-between gap-3'>
                                            <span className='text-slate-500'>Phí giao hàng</span>

                                            <PriceText
                                                value={shippingFee}
                                                className='font-semibold'
                                            />
                                        </div>

                                        <div className='mb-3 d-flex justify-content-between gap-3'>
                                            <span className='text-slate-500'>Voucher</span>

                                            <span
                                                className={`text-end font-semibold ${order.coupon_code ? 'text-orange-600' : 'text-slate-400'
                                                    }`}
                                            >
                                                {order.coupon_code || 'Không áp dụng'}
                                            </span>
                                        </div>

                                        <div className='mb-3 d-flex justify-content-between gap-3'>
                                            <span className='text-slate-500'>Giảm giá</span>

                                            <PriceText
                                                value={discountAmount}
                                                className='font-semibold text-emerald-600'
                                            />
                                        </div>

                                        <hr />

                                        <div className='mb-4 d-flex align-items-center justify-content-between gap-3'>
                                            <span className='font-semibold text-slate-950'>
                                                Tổng cộng
                                            </span>

                                            <PriceText
                                                value={totalAmount}
                                                className='text-2xl font-black text-orange-600'
                                            />
                                        </div>

                                        {order.payment_method === 'bank_transfer' && payment?.qr_url && (
                                            <div className='mb-4 !rounded-4 border border-orange-100 bg-orange-50 p-3 text-center'>
                                                <img
                                                    src={payment.qr_url}
                                                    alt='QR chuyển khoản'
                                                    className='img-fluid !rounded-3'
                                                />

                                                <p className='mt-3 mb-1 text-sm text-slate-500'>
                                                    Nội dung chuyển khoản
                                                </p>

                                                <p className='mb-0 font-semibold text-orange-700'>
                                                    {payment.transfer_content || payment.payment_code}
                                                </p>
                                            </div>
                                        )}

                                        <div className='d-flex flex-column gap-2'>
                                            {order.payment_method !== 'cod' && (
                                                <Button
                                                    type='button'
                                                    className='w-100'
                                                    onClick={() => navigate(`/payment-result/${orderId}`)}
                                                >
                                                    Xem thanh toán
                                                </Button>
                                            )}

                                            {order && canCancelOrder(order) && (
                                                <Button
                                                    type='button'
                                                    variant='danger'
                                                    className='w-100'
                                                    onClick={handleOpenCancelModal}
                                                >
                                                    Hủy đơn
                                                </Button>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}
                </Container>
            </section>

            <Modal
                show={isCancelModalOpen}
                onHide={handleCloseCancelModal}
                centered
                backdrop={loadingAction ? 'static' : true}
                keyboard={!loadingAction}
            >
                <Modal.Body className='p-4'>
                    <div className='mb-3 d-flex align-items-start gap-3'>
                        <span
                            className='d-flex align-items-center justify-content-center !rounded-circle bg-red-50 text-red-600'
                            style={{
                                width: 48,
                                height: 48,
                                minWidth: 48,
                            }}
                        >
                            <i className='bi bi-exclamation-triangle-fill fs-5' />
                        </span>

                        <div>
                            <h3 className='mb-2 text-xl font-semibold text-slate-950'>
                                Xác nhận hủy đơn hàng
                            </h3>

                            <p className='mb-0 text-slate-500'>
                                Bạn có chắc chắn muốn hủy đơn{' '}
                                <span className='font-normal text-orange-600'>
                                    {getOrderCode(order, orderId)}
                                </span>{' '}
                                không? Sau khi hủy, đơn hàng sẽ chuyển sang trạng thái đã hủy.
                            </p>
                        </div>
                    </div>

                    <div className='mb-4 !rounded-4 border border-slate-200 bg-slate-50 p-3'>
                        <div className='d-flex justify-content-between gap-3'>
                            <span className='text-slate-500'>Tổng tiền</span>

                            <PriceText
                                value={totalAmount}
                                className='font-semibold text-orange-600'
                            />
                        </div>
                    </div>

                    <div className='d-flex justify-content-end gap-2'>
                        <Button
                            type='button'
                            variant='secondary'
                            onClick={handleCloseCancelModal}
                            disabled={Boolean(loadingAction)}
                        >
                            Không hủy
                        </Button>

                        <Button
                            type='button'
                            variant='danger'
                            onClick={handleConfirmCancel}
                            isLoading={Boolean(loadingAction)}
                        >
                            Xác nhận hủy
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        </MainLayout>
    )
}

export default OrderDetailPage
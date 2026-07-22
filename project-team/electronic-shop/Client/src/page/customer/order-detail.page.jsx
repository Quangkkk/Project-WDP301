import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import {
  cancelOrder,
  createReturnRequest,
  getOrderById,
} from '../../services/order.service'
import { getPaymentByOrder } from '../../services/payment.service'
import { createReview, getMyReviews } from '../../services/review.service'
import { addToWishlist } from '../../services/wishlist.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import {
  formatDate,
  formatOrderCode,
  getId,
} from '../../utils/format'

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
        approved: 'bg-emerald-50 text-emerald-700',
        rejected: 'bg-red-50 text-red-700',
        received: 'bg-blue-50 text-blue-700',
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
    const orderCode = formatOrderCode(order || orderId)

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


function getReviewProductId(review) {
    const product = review?.product_id || review?.product

    if (typeof product === 'string') {
        return product
    }

    return getId(product) || ''
}

function buildReviewedProductIds(reviews) {
    return new Set(
        (Array.isArray(reviews) ? reviews : [])
            .map(getReviewProductId)
            .filter(Boolean),
    )
}

const returnReasonOptions = [
    { value: '', label: 'Chọn lý do trả hàng' },
    { value: 'damaged', label: 'Sản phẩm bị hư hỏng' },
    { value: 'wrong_item', label: 'Giao sai sản phẩm' },
    { value: 'not_as_described', label: 'Sản phẩm không đúng mô tả' },
    { value: 'missing_parts', label: 'Thiếu phụ kiện hoặc bộ phận' },
    { value: 'changed_mind', label: 'Không còn nhu cầu sử dụng' },
    { value: 'other', label: 'Lý do khác' },
]

function getReturnStatusLabel(status) {
    const map = {
        pending: 'Chờ duyệt',
        approved: 'Đã được duyệt',
        rejected: 'Đã bị từ chối',
        received: 'Shop đã nhận hàng trả',
        refunded: 'Đã hoàn tiền',
    }

    return map[status] || status || 'Không xác định'
}

function canCreateReturnRequest(order) {
    const returnStatus = order?.return_request?.status

    return (
        order?.status === 'completed' &&
        (!returnStatus || returnStatus === 'rejected')
    )
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
    const location = useLocation()
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
    const [myReviews, setMyReviews] = useState([])
    const [reviewTarget, setReviewTarget] = useState(null)
    const [reviewRating, setReviewRating] = useState(0)
    const [reviewComment, setReviewComment] = useState('')
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)
    const [didAutoOpenReview, setDidAutoOpenReview] = useState(false)
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
    const [returnItemsDraft, setReturnItemsDraft] = useState({})
    const [returnReason, setReturnReason] = useState('')
    const [returnDescription, setReturnDescription] = useState('')
    const [isSubmittingReturn, setIsSubmittingReturn] = useState(false)

    const receiverAddress = useMemo(() => getReceiverAddress(order), [order])

    const reviewedProductIds = useMemo(
        () => buildReviewedProductIds(myReviews),
        [myReviews],
    )

    const reviewableItems = useMemo(() => {
        if (order?.status !== 'completed') {
            return []
        }

        const seenProductIds = new Set()

        return items.filter((item) => {
            const productId = getProductIdFromItem(item)

            if (
                !productId ||
                reviewedProductIds.has(productId) ||
                seenProductIds.has(productId)
            ) {
                return false
            }

            seenProductIds.add(productId)
            return true
        })
    }, [order, items, reviewedProductIds])

    const firstReviewableItem = reviewableItems[0] || null

    const currentReturnRequest = order?.return_request || null
    const canRequestReturn = canCreateReturnRequest(order)

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

            const [orderResponse, reviews] = await Promise.all([
                getOrderById(orderId),
                getMyReviews({
                    order_id: orderId,
                }),
            ])

            const payload = normalizeOrderPayload(orderResponse)

            setOrder(payload.order || null)
            setItems(payload.items || [])
            setMyReviews(Array.isArray(reviews) ? reviews : [])

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
            setMyReviews([])
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

    useEffect(() => {
        if (
            didAutoOpenReview ||
            !location.state?.openReview ||
            order?.status !== 'completed' ||
            items.length === 0
        ) {
            return
        }

        setDidAutoOpenReview(true)

        const firstUnreviewedItem = items.find((item) => {
            const productId = getProductIdFromItem(item)

            return (
                productId &&
                !reviewedProductIds.has(productId)
            )
        })

        if (firstUnreviewedItem) {
            setReviewTarget(firstUnreviewedItem)
            setReviewRating(0)
            setReviewComment('')
        }
    }, [
        didAutoOpenReview,
        location.state,
        order,
        items,
        reviewedProductIds,
    ])


    const canReviewItem = (item) => {
        if (order?.status !== 'completed') {
            return false
        }

        const productId = getProductIdFromItem(item)

        return Boolean(
            productId &&
            !reviewedProductIds.has(productId),
        )
    }

    const handleOpenReviewModal = (item) => {
        if (!canReviewItem(item)) {
            return
        }

        setError('')
        setMessage('')
        setReviewTarget(item)
        setReviewRating(0)
        setReviewComment('')
    }

    const handleCloseReviewModal = () => {
        if (isSubmittingReview) {
            return
        }

        setReviewTarget(null)
        setReviewRating(0)
        setReviewComment('')
    }

    const handleSelectReviewProduct = (event) => {
        const productId = event.target.value
        const nextTarget = reviewableItems.find(
            (item) => getProductIdFromItem(item) === productId,
        )

        if (!nextTarget) {
            return
        }

        setReviewTarget(nextTarget)
        setReviewRating(0)
        setReviewComment('')
        setError('')
        setMessage('')
    }

    const handleSubmitReview = async () => {
        const productId = getProductIdFromItem(reviewTarget)

        if (!productId) {
            setError('Không tìm thấy sản phẩm để đánh giá.')
            return
        }

        if (
            !Number.isInteger(Number(reviewRating)) ||
            Number(reviewRating) < 1 ||
            Number(reviewRating) > 5
        ) {
            setError('Vui lòng chọn số sao từ 1 đến 5.')
            return
        }

        try {
            setIsSubmittingReview(true)
            setError('')
            setMessage('')

            const response = await createReview({
                order_id: orderId,
                product_id: productId,
                rating: Number(reviewRating),
                comment: reviewComment.trim() || undefined,
                images: [],
            })

            const createdReview =
                response?.data ||
                response?.review ||
                response

            setMyReviews((current) => {
                const nextReviews = [...current]

                if (
                    createdReview &&
                    getReviewProductId(createdReview)
                ) {
                    nextReviews.unshift(createdReview)
                } else {
                    nextReviews.unshift({
                        order_id: orderId,
                        product_id: productId,
                        rating: Number(reviewRating),
                        comment: reviewComment.trim() || null,
                    })
                }

                return nextReviews
            })

            setReviewTarget(null)
            setReviewRating(0)
            setReviewComment('')
            setMessage('Đã gửi đánh giá sản phẩm thành công.')
        } catch (error) {
            const rawMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                ''

            if (
                String(rawMessage)
                    .toLowerCase()
                    .includes('da danh gia') ||
                String(rawMessage)
                    .toLowerCase()
                    .includes('đã đánh giá') ||
                String(rawMessage)
                    .toLowerCase()
                    .includes('duplicate')
            ) {
                try {
                    const reviews = await getMyReviews({
                        order_id: orderId,
                    })

                    setMyReviews(
                        Array.isArray(reviews) ? reviews : [],
                    )
                } catch {
                    // Khong lam mat loi goc neu tai lai trang thai review that bai.
                }

                setReviewTarget(null)
                setMessage('Sản phẩm này đã được đánh giá.')
                return
            }

            setError(
                getErrorMessage(
                    error,
                    'Không gửi được đánh giá sản phẩm.',
                ),
            )
        } finally {
            setIsSubmittingReview(false)
        }
    }

    const handleOpenReturnModal = () => {
        if (!canRequestReturn) {
            return
        }

        const initialDraft = Object.fromEntries(
            items
                .map((item) => getId(item))
                .filter(Boolean)
                .map((itemId) => [
                    itemId,
                    {
                        selected: false,
                        quantity: 1,
                    },
                ]),
        )

        setReturnItemsDraft(initialDraft)
        setReturnReason('')
        setReturnDescription('')
        setError('')
        setMessage('')
        setIsReturnModalOpen(true)
    }

    const handleCloseReturnModal = () => {
        if (isSubmittingReturn) {
            return
        }

        setIsReturnModalOpen(false)
        setReturnItemsDraft({})
        setReturnReason('')
        setReturnDescription('')
    }

    const handleToggleReturnItem = (itemId) => {
        setReturnItemsDraft((current) => ({
            ...current,
            [itemId]: {
                selected: !current[itemId]?.selected,
                quantity: current[itemId]?.quantity || 1,
            },
        }))
    }

    const handleReturnQuantityChange = (item, rawValue) => {
        const itemId = getId(item)
        const purchasedQuantity = Math.max(Number(item.quantity || 1), 1)
        const parsedValue = Number(rawValue)
        const nextQuantity = Number.isFinite(parsedValue)
            ? Math.min(Math.max(Math.trunc(parsedValue), 1), purchasedQuantity)
            : 1

        setReturnItemsDraft((current) => ({
            ...current,
            [itemId]: {
                selected: current[itemId]?.selected || false,
                quantity: nextQuantity,
            },
        }))
    }

    const handleSubmitReturnRequest = async () => {
        const selectedItems = items
            .filter((item) => returnItemsDraft[getId(item)]?.selected)
            .map((item) => ({
                order_item_id: getId(item),
                quantity: Number(returnItemsDraft[getId(item)]?.quantity || 1),
            }))

        if (selectedItems.length === 0) {
            setError('Vui lòng chọn ít nhất một sản phẩm muốn trả.')
            return
        }

        if (!returnReason) {
            setError('Vui lòng chọn lý do trả hàng.')
            return
        }

        try {
            setIsSubmittingReturn(true)
            setError('')
            setMessage('')

            const response = await createReturnRequest(orderId, {
                items: selectedItems,
                reason: returnReason,
                description: returnDescription.trim() || undefined,
            })

            const updatedOrder =
                response?.data ||
                response?.order ||
                response

            if (updatedOrder && getId(updatedOrder)) {
                setOrder(updatedOrder)
            } else {
                await loadDetail()
            }

            setIsReturnModalOpen(false)
            setReturnItemsDraft({})
            setReturnReason('')
            setReturnDescription('')
            setMessage('Đã gửi yêu cầu trả hàng. STAFF sẽ kiểm tra và phản hồi.')
        } catch (error) {
            setError(
                getErrorMessage(
                    error,
                    'Không gửi được yêu cầu trả hàng.',
                ),
            )
        } finally {
            setIsSubmittingReturn(false)
        }
    }

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
                            className='mb-3 d-inline-flex align-items-center gap-2 rounded-pill border bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
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
                                    {formatOrderCode(order)}
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
                                                <div className='h-100 rounded-4 border border-slate-100 bg-slate-50 p-3'>
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
                                                <div className='h-100 rounded-4 border border-slate-100 bg-slate-50 p-3'>
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
                                <div
                                    className='position-sticky'
                                    style={{
                                        top: 120,
                                        zIndex: 10,
                                    }}
                                >
                                    <Card className='card-surface overflow-hidden'>
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
                                            <span className='text-slate-500'>Mã giảm giá</span>

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

                                    {(firstReviewableItem || canRequestReturn) && (
                                        <div className='mt-3 d-flex gap-2'>
                                            {firstReviewableItem && (
                                                <Button
                                                    type='button'
                                                    className='flex-grow-1 py-3'
                                                    onClick={() =>
                                                        handleOpenReviewModal(firstReviewableItem)
                                                    }
                                                >
                                                    <i className='bi bi-star-fill me-2' />
                                                    Đánh giá
                                                </Button>
                                            )}

                                            {canRequestReturn && (
                                                <Button
                                                    type='button'
                                                    variant='secondary'
                                                    className='flex-grow-1 py-3'
                                                    onClick={handleOpenReturnModal}
                                                >
                                                    <i className='bi bi-arrow-counterclockwise me-2' />
                                                    {currentReturnRequest?.status === 'rejected'
                                                        ? 'Gửi lại yêu cầu'
                                                        : 'Trả hàng'}
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {currentReturnRequest && (
                                        <div className='mt-3 !rounded-4 border border-slate-200 bg-white p-3 shadow-sm'>
                                            <div className='d-flex flex-wrap align-items-center justify-content-between gap-2'>
                                                <span className='text-sm font-semibold text-slate-700'>
                                                    Yêu cầu trả hàng
                                                </span>

                                                <StatusPill status={currentReturnRequest.status}>
                                                    {getReturnStatusLabel(currentReturnRequest.status)}
                                                </StatusPill>
                                            </div>

                                            {currentReturnRequest.staff_note && (
                                                <p className='mb-0 mt-2 text-sm text-slate-500'>
                                                    <b>Phản hồi của STAFF:</b>{' '}
                                                    {currentReturnRequest.staff_note}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    )}
                </Container>
            </section>

            <Modal
                show={Boolean(reviewTarget)}
                onHide={handleCloseReviewModal}
                centered
                backdrop={isSubmittingReview ? 'static' : true}
                keyboard={!isSubmittingReview}
            >
                <Modal.Header className='border-bottom px-4 py-3'>
                    <Modal.Title className='text-xl font-semibold text-slate-950'>
                        Đánh giá sản phẩm
                    </Modal.Title>

                    <button
                        type='button'
                        onClick={handleCloseReviewModal}
                        disabled={isSubmittingReview}
                        className='ms-auto border-0 bg-transparent text-3xl leading-none text-slate-400 transition hover:text-slate-700 disabled:opacity-50'
                        aria-label='Đóng'
                    >
                        ×
                    </button>
                </Modal.Header>

                <Modal.Body className='p-4'>
                    <div className='mb-4'>
                        <label
                            htmlFor='review-product'
                            className='mb-2 d-block font-semibold text-slate-800'
                        >
                            Sản phẩm muốn đánh giá
                            <span className='ms-1 text-red-500'>*</span>
                        </label>

                        <select
                            id='review-product'
                            value={getProductIdFromItem(reviewTarget)}
                            onChange={handleSelectReviewProduct}
                            disabled={isSubmittingReview}
                            className='form-select mb-3 !rounded-3 border-slate-200 px-3 py-3 shadow-none focus:border-orange-400 focus:ring-0'
                        >
                            {reviewableItems.map((item) => {
                                const productId = getProductIdFromItem(item)
                                const variantText = getVariantText(item)

                                return (
                                    <option
                                        key={productId}
                                        value={productId}
                                    >
                                        {getProductName(item)}
                                        {variantText ? ` - ${variantText}` : ''}
                                    </option>
                                )
                            })}
                        </select>

                        {reviewTarget && (
                            <div className='d-flex align-items-center gap-3 !rounded-4 border border-slate-200 bg-slate-50 p-3'>
                                <div
                                    className='d-flex align-items-center justify-content-center overflow-hidden !rounded-3 bg-white'
                                    style={{
                                        width: 64,
                                        height: 64,
                                        minWidth: 64,
                                    }}
                                >
                                    {getProductImage(reviewTarget) ? (
                                        <img
                                            src={getProductImage(reviewTarget)}
                                            alt={getProductName(reviewTarget)}
                                            className='h-100 w-100 object-fit-cover'
                                        />
                                    ) : (
                                        <span className='text-2xl'>📦</span>
                                    )}
                                </div>

                                <div>
                                    <p className='mb-1 font-semibold text-slate-900'>
                                        {getProductName(reviewTarget)}
                                    </p>

                                    {getVariantText(reviewTarget) && (
                                        <p className='mb-0 text-sm text-slate-500'>
                                            {getVariantText(reviewTarget)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <p className='mb-0 mt-2 text-xs text-slate-500'>
                            Bạn chỉ cần đánh giá sản phẩm mình muốn, không bắt buộc đánh giá toàn bộ đơn hàng.
                        </p>
                    </div>

                    <div className='mb-4'>
                        <p className='mb-2 font-semibold text-slate-800'>
                            Mức độ hài lòng
                        </p>

                        <div className='d-flex flex-wrap gap-2'>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type='button'
                                    onClick={() => setReviewRating(star)}
                                    disabled={isSubmittingReview}
                                    className='border-0 bg-transparent p-1 text-3xl transition hover:scale-110 disabled:opacity-50'
                                    aria-label={`${star} sao`}
                                    title={`${star} sao`}
                                >
                                    <span
                                        className={
                                            star <= reviewRating
                                                ? 'text-amber-400'
                                                : 'text-slate-300'
                                        }
                                    >
                                        ★
                                    </span>
                                </button>
                            ))}
                        </div>

                        <p
                            className={`mb-0 mt-1 text-sm ${
                                reviewRating > 0
                                    ? 'text-slate-500'
                                    : 'font-semibold text-red-500'
                            }`}
                        >
                            {reviewRating > 0
                                ? `Bạn đã chọn ${reviewRating} sao.`
                                : 'Vui lòng chọn số sao trước khi gửi đánh giá.'}
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor='review-comment'
                            className='mb-2 d-block font-semibold text-slate-800'
                        >
                            Nhận xét <span className='text-sm font-normal text-slate-400'>(không bắt buộc)</span>
                        </label>

                        <textarea
                            id='review-comment'
                            rows={5}
                            maxLength={1000}
                            value={reviewComment}
                            onChange={(event) =>
                                setReviewComment(event.target.value)
                            }
                            disabled={isSubmittingReview}
                            placeholder='Chia sẻ trải nghiệm của bạn về sản phẩm...'
                            className='form-control !rounded-4 border-slate-200 px-3 py-3 shadow-none focus:border-orange-400 focus:ring-0'
                        />

                        <p className='mb-0 mt-2 text-end text-xs text-slate-400'>
                            {reviewComment.length}/1000
                        </p>
                    </div>
                </Modal.Body>

                <Modal.Footer className='border-top px-4 py-3'>
                    <Button
                        type='button'
                        variant='secondary'
                        onClick={handleCloseReviewModal}
                        disabled={isSubmittingReview}
                    >
                        Hủy
                    </Button>

                    <Button
                        type='button'
                        onClick={handleSubmitReview}
                        isLoading={isSubmittingReview}
                        disabled={
                            isSubmittingReview ||
                            !reviewTarget ||
                            Number(reviewRating) < 1
                        }
                    >
                        Gửi đánh giá
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={isReturnModalOpen}
                onHide={handleCloseReturnModal}
                centered
                size='lg'
                backdrop={isSubmittingReturn ? 'static' : true}
                keyboard={!isSubmittingReturn}
            >
                <Modal.Header className='border-bottom px-4 py-3'>
                    <Modal.Title className='text-xl font-semibold text-slate-950'>
                        Yêu cầu trả hàng
                    </Modal.Title>

                    <button
                        type='button'
                        onClick={handleCloseReturnModal}
                        disabled={isSubmittingReturn}
                        className='ms-auto border-0 bg-transparent text-3xl leading-none text-slate-400 transition hover:text-slate-700 disabled:opacity-50'
                        aria-label='Đóng'
                    >
                        ×
                    </button>
                </Modal.Header>

                <Modal.Body className='p-4'>
                    <Alert type='danger'>{error}</Alert>

                    <p className='mb-3 font-semibold text-slate-800'>
                        Chọn sản phẩm và số lượng muốn trả
                        <span className='ms-1 text-red-500'>*</span>
                    </p>

                    <div className='mb-4 d-flex flex-column gap-3'>
                        {items.map((item) => {
                            const itemId = getId(item)
                            const draft = returnItemsDraft[itemId] || {
                                selected: false,
                                quantity: 1,
                            }
                            const purchasedQuantity = Math.max(
                                Number(item.quantity || 1),
                                1,
                            )

                            return (
                                <div
                                    key={itemId}
                                    className={`!rounded-4 border p-3 transition ${
                                        draft.selected
                                            ? 'border-orange-300 bg-orange-50/50'
                                            : 'border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className='d-flex flex-wrap align-items-center gap-3'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(draft.selected)}
                                            onChange={() => handleToggleReturnItem(itemId)}
                                            disabled={isSubmittingReturn}
                                            className='form-check-input m-0'
                                            aria-label={`Chọn ${getProductName(item)}`}
                                        />

                                        <div
                                            className='d-flex align-items-center justify-content-center overflow-hidden !rounded-3 bg-slate-100'
                                            style={{
                                                width: 64,
                                                height: 64,
                                                minWidth: 64,
                                            }}
                                        >
                                            {getProductImage(item) ? (
                                                <img
                                                    src={getProductImage(item)}
                                                    alt={getProductName(item)}
                                                    className='h-100 w-100 object-fit-cover'
                                                />
                                            ) : (
                                                <span className='text-2xl'>📦</span>
                                            )}
                                        </div>

                                        <div className='flex-grow-1'>
                                            <p className='mb-1 font-semibold text-slate-900'>
                                                {getProductName(item)}
                                            </p>

                                            {getVariantText(item) && (
                                                <p className='mb-0 text-sm text-slate-500'>
                                                    {getVariantText(item)}
                                                </p>
                                            )}

                                            <p className='mb-0 mt-1 text-xs text-slate-400'>
                                                Đã mua: {purchasedQuantity}
                                            </p>
                                        </div>

                                        <div style={{ width: 125 }}>
                                            <label
                                                htmlFor={`return-quantity-${itemId}`}
                                                className='mb-1 d-block text-xs font-semibold text-slate-500'
                                            >
                                                Số lượng trả
                                            </label>

                                            <input
                                                id={`return-quantity-${itemId}`}
                                                type='number'
                                                min='1'
                                                max={purchasedQuantity}
                                                value={draft.quantity}
                                                onChange={(event) =>
                                                    handleReturnQuantityChange(
                                                        item,
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={
                                                    !draft.selected ||
                                                    isSubmittingReturn
                                                }
                                                className='form-control !rounded-3 border-slate-200 shadow-none focus:border-orange-400 focus:ring-0'
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className='mb-4'>
                        <label
                            htmlFor='return-reason'
                            className='mb-2 d-block font-semibold text-slate-800'
                        >
                            Lý do trả hàng
                            <span className='ms-1 text-red-500'>*</span>
                        </label>

                        <select
                            id='return-reason'
                            value={returnReason}
                            onChange={(event) => setReturnReason(event.target.value)}
                            disabled={isSubmittingReturn}
                            className='form-select !rounded-3 border-slate-200 px-3 py-3 shadow-none focus:border-orange-400 focus:ring-0'
                        >
                            {returnReasonOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor='return-description'
                            className='mb-2 d-block font-semibold text-slate-800'
                        >
                            Mô tả thêm
                            <span className='ms-2 text-sm font-normal text-slate-400'>
                                Không bắt buộc
                            </span>
                        </label>

                        <textarea
                            id='return-description'
                            rows='4'
                            maxLength='1000'
                            value={returnDescription}
                            onChange={(event) => setReturnDescription(event.target.value)}
                            disabled={isSubmittingReturn}
                            placeholder='Mô tả chi tiết tình trạng sản phẩm'
                            className='form-control !rounded-3 border-slate-200 px-3 py-3 shadow-none focus:border-orange-400 focus:ring-0'
                        />
                    </div>
                </Modal.Body>

                <Modal.Footer className='border-top px-4 py-3'>
                    <Button
                        type='button'
                        variant='secondary'
                        onClick={handleCloseReturnModal}
                        disabled={isSubmittingReturn}
                    >
                        Đóng
                    </Button>

                    <Button
                        type='button'
                        onClick={handleSubmitReturnRequest}
                        isLoading={isSubmittingReturn}
                    >
                        Gửi yêu cầu
                    </Button>
                </Modal.Footer>
            </Modal>

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
                                    {formatOrderCode(order || orderId)}
                                </span>{' '}
                                không? Sau khi hủy đơn hàng sẽ không thể hoàn tác.
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
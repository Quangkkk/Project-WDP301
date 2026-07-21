import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import Modal from 'react-bootstrap/Modal'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'
import PriceText from '../../components/atoms/PriceText'

import { getErrorMessage } from '../../services/api'
import { cancelOrder, getOrders } from '../../services/order.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import {
  formatDate,
  formatOrderCode,
  getId,
  pickArray,
} from '../../utils/format'

const orderTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xác nhận' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'shipping', label: 'Đang giao' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
]

const tableGridStyle = {
  display: 'grid',
  gridTemplateColumns: '140px 150px minmax(360px, 1.7fr) 180px 190px 150px',
  alignItems: 'center',
  minWidth: 1170,
}

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

function getStatusClass(status) {
  const map = {
    pending: 'bg-orange-50 text-orange-700',
    confirmed: 'bg-blue-50 text-blue-700',
    processing: 'bg-amber-50 text-amber-700',
    shipping: 'bg-indigo-50 text-indigo-700',
    completed: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-700',
  }

  return map[status] || 'bg-slate-100 text-slate-600'
}

function StatusPill({ children, status }) {
  return (
    <span
      className={`d-inline-flex align-items-center justify-content-center rounded-pill px-3 py-2 text-xs font-black ${getStatusClass(status)}`}
      style={{
        minWidth: 120,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function getOrderItemsSummary(order) {
  const items = Array.isArray(order?.items) ? order.items : []

  if (!items.length) {
    return 'Chưa có sản phẩm'
  }

  const firstItem = items[0]
  const product = firstItem.product_id || firstItem.product || {}

  const name =
    typeof product === 'string'
      ? firstItem.product_name || 'Sản phẩm'
      : product.name || firstItem.product_name || 'Sản phẩm'

  const quantity = Number(firstItem.quantity || 1)
  const remain = items.length - 1

  return remain > 0
    ? `${name} x ${quantity} + ${remain} sản phẩm khác`
    : `${name} x ${quantity}`
}


function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function getOrderSearchText(order) {
  const items = Array.isArray(order?.items) ? order.items : []

  const itemText = items
    .map((item) => {
      const product = item?.product_id || item?.product || {}
      const variant = item?.variant_id || item?.variant || {}

      const productName =
        typeof product === 'string'
          ? item?.product_name || ''
          : product?.name || item?.product_name || ''

      const variantText =
        typeof variant === 'string'
          ? item?.variant_name || item?.variant_value || ''
          : [
              variant?.variant_name,
              variant?.variant_value,
              variant?.sku,
              variant?.color,
              variant?.storage,
              variant?.ram,
            ]
              .filter(Boolean)
              .join(' ')

      return [
        productName,
        variantText,
        item?.product_name,
        item?.variant_name,
        item?.variant_value,
      ]
        .filter(Boolean)
        .join(' ')
    })
    .join(' ')

  return normalizeSearchText(
    [
      formatOrderCode(order),
      order?.order_code,
      order?.orderCode,
      getId(order),
      itemText,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function canCancelOrder(order) {
  return ['pending', 'confirmed', 'processing'].includes(order?.status)
}

function OrderHistoryPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadingId, setLoadingId] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadOrders = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await getOrders({
        user_id: getUserId(user),
      })

      setOrders(pickArray(response, []))
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được lịch sử đơn hàng.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const orderCounts = useMemo(() => {
    const countMap = {
      all: orders.length,
    }

    for (const order of orders) {
      countMap[order.status] = (countMap[order.status] || 0) + 1
    }

    return countMap
  }, [orders])

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = normalizeSearchText(searchKeyword)

    return orders.filter((order) => {
      const matchesStatus =
        activeTab === 'all' || order.status === activeTab

      if (!matchesStatus) {
        return false
      }

      if (!normalizedKeyword) {
        return true
      }

      return getOrderSearchText(order).includes(normalizedKeyword)
    })
  }, [orders, activeTab, searchKeyword])

  const handleOpenCancelModal = (event, order) => {
    event.stopPropagation()
    setError('')
    setMessage('')
    setCancelTarget(order)
  }

  const handleCloseCancelModal = () => {
    if (loadingId) return
    setCancelTarget(null)
  }

  const handleConfirmCancel = async () => {
    const orderId = getId(cancelTarget)

    if (!orderId) {
      setError('Không tìm thấy mã đơn hàng để hủy.')
      setCancelTarget(null)
      return
    }

    try {
      setLoadingId(orderId)
      setError('')
      setMessage('')

      await cancelOrder(orderId)

      setCancelTarget(null)
      setMessage('Đã hủy đơn hàng thành công.')
      await loadOrders()
    } catch (error) {
      setError(getErrorMessage(error, 'Không hủy được đơn hàng.'))
    } finally {
      setLoadingId('')
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <div className='mb-4 d-flex flex-column flex-lg-row align-items-lg-end gap-4'>
            <div
              className='flex-shrink-0'
              style={{
                minWidth: 270,
              }}
            >
              <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
                Đơn hàng
              </p>

              <h1 className='mb-0 text-3xl font-black text-slate-950'>
                Lịch sử đơn hàng
              </h1>
            </div>

            <div className='d-flex flex-grow-1 justify-content-lg-center'>
              <div
                className='d-flex w-100 align-items-center overflow-hidden rounded-pill border border-slate-200 bg-white shadow-sm transition focus-within:border-orange-400'
                style={{
                  maxWidth: 650,
                  minHeight: 50,
                }}
              >
                <span className='d-flex align-items-center justify-content-center ps-4 text-slate-400'>
                  <i className='bi bi-search fs-5' />
                </span>

                <input
                  type='search'
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder='Tìm theo mã đơn hoặc tên sản phẩm...'
                  className='flex-grow-1 border-0 bg-transparent px-3 py-3 text-sm text-slate-800 outline-none'
                  aria-label='Tìm kiếm đơn hàng'
                />

                {/* {searchKeyword && (
                  <button
                    type='button'
                    onClick={() => setSearchKeyword('')}
                    className='me-2 d-flex align-items-center justify-content-center !rounded-circle border-0 bg-slate-100 text-slate-500 transition hover:bg-orange-100 hover:text-orange-600'
                    style={{
                      width: 34,
                      height: 34,
                      minWidth: 34,
                    }}
                    aria-label='Xóa tìm kiếm'
                  >
                    <i className='bi bi-x-lg' />
                  </button>
                )} */}
              </div>
            </div>

            <div
              className='d-flex flex-shrink-0 justify-content-lg-end'
              style={{
                minWidth: 210,
              }}
            >
              <Button
                type='button'
                variant='secondary'
                onClick={() => navigate('/products')}
              >
                Tiếp tục mua hàng
              </Button>
            </div>
          </div>

          {searchKeyword && (
            <p className='mb-3 text-center text-sm font-semibold text-slate-500'>
              Tìm thấy{' '}
              <span className='font-black text-orange-600'>
                {filteredOrders.length}
              </span>{' '}
              đơn hàng
            </p>
          )}

          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

          {isLoading ? (
            <LoadingText />
          ) : !user ? (
            <EmptyState
              icon='🔐'
              title='Bạn cần đăng nhập'
              description='Vui lòng đăng nhập để xem lịch sử đơn hàng.'
              actionLabel='Đăng nhập'
              onAction={() => navigate('/login')}
            />
          ) : (
            <Card className='card-surface overflow-hidden'>
              <Card.Body className='p-0'>
                <div className='border-bottom bg-white px-3 pt-3'>
                  <div className='d-flex flex-nowrap gap-3 overflow-auto pb-3'>
                    {orderTabs.map((tab) => {
                      const isActive = activeTab === tab.key

                      return (
                        <button
                          key={tab.key}
                          type='button'
                          onClick={() => setActiveTab(tab.key)}
                          className={`d-inline-flex align-items-center justify-content-center gap-2 rounded-4 border px-4 py-3 text-sm font-black shadow-sm transition ${isActive
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
                            }`}
                          style={{
                            minWidth: 150,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tab.label}

                          <span
                            className={`d-inline-flex align-items-center justify-content-center rounded-3 px-2 py-1 text-xs ${isActive
                                ? 'bg-white text-orange-600'
                                : 'bg-slate-100 text-slate-500'
                              }`}
                            style={{
                              minWidth: 26,
                            }}
                          >
                            {orderCounts[tab.key] || 0}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>


                {filteredOrders.length === 0 ? (
                  <div className='p-5'>
                    <EmptyState
                      icon={searchKeyword ? '🔍' : '📦'}
                      title={
                        searchKeyword
                          ? 'Không tìm thấy đơn hàng'
                          : 'Chưa có đơn hàng'
                      }
                      description={
                        searchKeyword
                          ? `Không có mã đơn hoặc sản phẩm nào khớp với “${searchKeyword}”.`
                          : 'Không có đơn hàng nào trong trạng thái này.'
                      }
                      actionLabel={searchKeyword ? 'Xóa tìm kiếm' : undefined}
                      onAction={
                        searchKeyword
                          ? () => setSearchKeyword('')
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  <div className='overflow-auto'>
                    <div
                      className='border-bottom bg-slate-50 text-sm font-black text-slate-700'
                      style={tableGridStyle}
                    >
                      <div className='px-4 py-3 text-center'>Mã đơn</div>
                      <div className='px-4 py-3 text-center'>Ngày đặt</div>
                      <div className='px-4 py-3 text-center'>Sản phẩm</div>
                      <div className='px-4 py-3 text-center'>Trạng thái</div>
                      <div className='px-4 py-3 text-center'>Tổng tiền</div>
                      <div className='px-4 py-3 text-center'>Thao tác</div>
                    </div>

                    {filteredOrders.map((order) => {
                      const orderId = getId(order)

                      return (
                        <div
                          key={orderId}
                          role='button'
                          tabIndex={0}
                          onClick={() => navigate(`/orders/${orderId}`)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              navigate(`/orders/${orderId}`)
                            }
                          }}
                          className='cursor-pointer border-bottom bg-white transition hover:bg-orange-50/40'
                          style={tableGridStyle}
                        >
                          <div className='px-4 py-4 text-center'>
                            <span className='font-black text-orange-600'>
                              {formatOrderCode(order)}
                            </span>
                          </div>

                          <div className='px-4 py-4 text-center font-normal text-slate-700'>
                            {formatDate(order.created_at)}
                          </div>

                          <div className='px-4 py-4'>
                            <p className='mb-0 text-sm font-normal text-slate-700'>
                              {getOrderItemsSummary(order)}
                            </p>
                          </div>

                          <div className='px-4 py-4 text-center'>
                            <StatusPill status={order.status}>
                              {getOrderStatusLabel(order.status)}
                            </StatusPill>
                          </div>

                          <div className='px-4 py-4 text-center'>
                            <PriceText
                              value={order.total_amount}
                              className='font-black text-orange-600'
                            />
                          </div>

                          <div className='px-4 py-4 text-center'>
                            {canCancelOrder(order) ? (
                              <Button
                                type='button'
                                variant='danger'
                                className='!rounded-pill px-4 py-2 text-sm'
                                onClick={(event) => handleOpenCancelModal(event, order)}
                                isLoading={loadingId === orderId}
                              >
                                Hủy
                              </Button>
                            ) : (
                              <span className='text-sm text-slate-400'>—</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Container>
      </section>

      <Modal
        show={Boolean(cancelTarget)}
        onHide={handleCloseCancelModal}
        centered
        backdrop={loadingId ? 'static' : true}
        keyboard={!loadingId}
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
              <h3 className='mb-2 text-xl font-black text-slate-950'>
                Xác nhận hủy đơn hàng
              </h3>

              <p className='mb-0 text-slate-500'>
                Bạn có chắc chắn muốn hủy đơn{' '}
                <span className='font-black text-orange-600'>
                  {cancelTarget ? formatOrderCode(cancelTarget) : ''}
                </span>{' '}
                không? Sau khi hủy, sẽ không thể hoàn tác.
              </p>
            </div>
          </div>

          {cancelTarget && (
            <div className='mb-4 !rounded-4 border border-slate-200 bg-slate-50 p-3'>
              <div className='d-flex justify-content-between gap-3'>
                <span className='text-slate-500'>Sản phẩm</span>

                <span className='text-end text-sm font-normal text-slate-700'>
                  {getOrderItemsSummary(cancelTarget)}
                </span>
              </div>

              <div className='mt-2 d-flex justify-content-between gap-3'>
                <span className='text-slate-500'>Tổng tiền</span>

                <PriceText
                  value={cancelTarget.total_amount}
                  className='font-black text-orange-600'
                />
              </div>
            </div>
          )}

          <div className='d-flex justify-content-end gap-2'>
            <Button
              type='button'
              variant='secondary'
              onClick={handleCloseCancelModal}
              disabled={Boolean(loadingId)}
            >
              Không hủy
            </Button>

            <Button
              type='button'
              variant='danger'
              onClick={handleConfirmCancel}
              isLoading={Boolean(loadingId)}
            >
              Xác nhận hủy
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </MainLayout>
  )
}

export default OrderHistoryPage
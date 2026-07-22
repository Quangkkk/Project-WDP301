import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import Table from 'react-bootstrap/Table'

import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import DashboardLayout from '../../components/templates/DashboardLayout'

import { getErrorMessage } from '../../services/api'
import {
  cancelOrder,
  getOrders,
  updateOrder,
} from '../../services/order.service'
import {
  formatDate,
  formatOrderCode,
  getId,
  pickArray,
} from '../../utils/format'

const orderStatusOptions = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const paymentStatusOptions = [
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'pending', label: 'Chờ thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'failed', label: 'Thanh toán thất bại' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

function getPaymentMethodLabel(method) {
  const map = {
    cod: 'COD',
    bank_transfer: 'Chuyển khoản',
    zalopay: 'ZaloPay',
  }

  return map[method] || method || '-'
}

function OrderManagementPage() {
  const [orders, setOrders] = useState([])
  const [orderStatusDraft, setOrderStatusDraft] = useState({})
  const [paymentStatusDraft, setPaymentStatusDraft] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingKey, setLoadingKey] = useState('')

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const load = async () => {
    try {
      setError('')

      const response = await getOrders()
      const data = pickArray(response, [])

      setOrders(data)
      setOrderStatusDraft(
        Object.fromEntries(
          data.map((order) => [getId(order), order.status || 'pending']),
        ),
      )
      setPaymentStatusDraft(
        Object.fromEntries(
          data.map((order) => [
            getId(order),
            order.payment_status || 'unpaid',
          ]),
        ),
      )
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Không tải được đơn hàng.'))
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleOrderStatusChange = async (orderId, nextStatus) => {
    const originalOrder = orders.find((order) => getId(order) === orderId)

    if (!originalOrder) return

    const currentStatus = originalOrder.status || 'pending'
    const isFinalStatus = ['completed', 'cancelled'].includes(currentStatus)

    if (isFinalStatus || nextStatus === currentStatus) return

    setOrderStatusDraft((prev) => ({
      ...prev,
      [orderId]: nextStatus,
    }))

    if (nextStatus === 'cancelled') {
      setCancelOrderId(orderId)
      setCancelReason('')
      setShowCancelModal(true)
      return
    }

    const key = `${orderId}:order`

    try {
      setLoadingKey(key)
      setError('')
      setMessage('')

      await updateOrder(orderId, {
        status: nextStatus,
      })

      setMessage('Đã cập nhật trạng thái đơn hàng.')
      await load()
    } catch (updateError) {
      setOrderStatusDraft((prev) => ({
        ...prev,
        [orderId]: currentStatus,
      }))

      setError(
        getErrorMessage(
          updateError,
          'Không cập nhật được trạng thái đơn hàng.',
        ),
      )
    } finally {
      setLoadingKey('')
    }
  }

  const handlePaymentStatusChange = async (orderId, nextStatus) => {
    const originalOrder = orders.find((order) => getId(order) === orderId)

    if (!originalOrder) return

    const currentStatus = originalOrder.payment_status || 'unpaid'

    if (nextStatus === currentStatus) return

    if (originalOrder.status === 'cancelled' && nextStatus === 'paid') {
      setError('Đơn đã hủy không thể chuyển sang trạng thái đã thanh toán.')
      return
    }

    setPaymentStatusDraft((prev) => ({
      ...prev,
      [orderId]: nextStatus,
    }))

    const key = `${orderId}:payment`

    try {
      setLoadingKey(key)
      setError('')
      setMessage('')

      await updateOrder(orderId, {
        payment_status: nextStatus,
      })

      setMessage('Đã cập nhật trạng thái thanh toán.')
      await load()
    } catch (updateError) {
      setPaymentStatusDraft((prev) => ({
        ...prev,
        [orderId]: currentStatus,
      }))

      setError(
        getErrorMessage(
          updateError,
          'Không cập nhật được trạng thái thanh toán.',
        ),
      )
    } finally {
      setLoadingKey('')
    }
  }

  const handleCloseCancelModal = () => {
    const originalOrder = orders.find(
      (order) => getId(order) === cancelOrderId,
    )

    if (originalOrder) {
      setOrderStatusDraft((prev) => ({
        ...prev,
        [cancelOrderId]: originalOrder.status || 'pending',
      }))
    }

    setShowCancelModal(false)
    setCancelOrderId('')
    setCancelReason('')
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Vui lòng nhập lý do hủy đơn.')
      return
    }

    const orderId = cancelOrderId
    const originalOrder = orders.find((order) => getId(order) === orderId)
    const key = `${orderId}:order`

    try {
      setLoadingKey(key)
      setError('')
      setMessage('')

      await cancelOrder(orderId, cancelReason.trim())

      setShowCancelModal(false)
      setCancelOrderId('')
      setCancelReason('')
      setMessage('Đã hủy đơn hàng và gửi email thông báo cho khách.')
      await load()
    } catch (cancelError) {
      if (originalOrder) {
        setOrderStatusDraft((prev) => ({
          ...prev,
          [orderId]: originalOrder.status || 'pending',
        }))
      }

      setError(getErrorMessage(cancelError, 'Không hủy được đơn hàng.'))
    } finally {
      setLoadingKey('')
    }
  }

  return (
    <DashboardLayout
      title='Quản lý đơn hàng'
      description='Chọn trực tiếp trạng thái thanh toán và trạng thái đơn hàng để cập nhật.'
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card
        className='card-surface overflow-hidden border-0 shadow-sm'
        style={{ borderRadius: '16px' }}
      >
        <Card.Body className='p-0'>
          <div className='w-100 overflow-hidden'>
            <Table
              hover
              className='mb-0 w-100 align-middle'
              style={{
                width: '100%',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>

              <thead style={{ backgroundColor: '#f8fafc' }}>
                <tr>
                  <th className='border-0 p-3 text-xs font-black uppercase tracking-wider text-slate-400'>
                    Đơn hàng
                  </th>
                  <th className='border-0 p-3 text-xs font-black uppercase tracking-wider text-slate-400'>
                    Khách hàng
                  </th>
                  <th className='border-0 p-3 text-center text-xs font-black uppercase tracking-wider text-slate-400'>
                    Tổng tiền
                  </th>
                  <th className='border-0 p-3 text-center text-xs font-black uppercase tracking-wider text-slate-400'>
                    Thanh toán
                  </th>
                  <th className='border-0 p-3 text-center text-xs font-black uppercase tracking-wider text-slate-400'>
                    Trạng thái đơn
                  </th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const id = getId(order)
                  const orderLoading = loadingKey === `${id}:order`
                  const paymentLoading = loadingKey === `${id}:payment`
                  const finalOrderStatus = ['completed', 'cancelled'].includes(
                    order.status,
                  )

                  return (
                    <tr
                      key={id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td className='p-3'>
                        <div className='min-w-0'>
                          <div
                            className='text-break font-black text-slate-900'
                            style={{ fontSize: '0.92rem', lineHeight: 1.3 }}
                          >
                            {formatOrderCode(order)}
                          </div>
                          <div className='mt-1 text-xs font-bold text-slate-400'>
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                      </td>

                      <td className='p-3'>
                        <div className='min-w-0'>
                          <div
                            className='text-truncate font-black text-slate-800'
                            title={
                              order.user_id?.name ||
                              order.receiver_name ||
                              '-'
                            }
                          >
                            {order.user_id?.name || order.receiver_name || '-'}
                          </div>
                          <div className='mt-1 text-truncate text-xs font-bold text-slate-500'>
                            {order.receiver_phone || '-'}
                          </div>
                        </div>
                      </td>

                      <td className='p-3 text-center'>
                        <div
                          className='d-inline-flex !rounded-lg border border-orange-100 bg-orange-50 px-2 py-1'
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <PriceText
                            value={order.total_amount}
                            className='text-sm font-black text-orange-600'
                          />
                        </div>
                      </td>

                      <td className='p-3'>
                        <div className='d-flex flex-column gap-2'>
                          <div className='text-center'>
                            <span className='!rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600'>
                              {getPaymentMethodLabel(order.payment_method)}
                            </span>
                          </div>

                          <Form.Select
                            value={
                              paymentStatusDraft[id] ||
                              order.payment_status ||
                              'unpaid'
                            }
                            onChange={(event) =>
                              handlePaymentStatusChange(id, event.target.value)
                            }
                            disabled={paymentLoading || orderLoading}
                            className='!rounded-lg border-slate-200 text-sm font-bold text-slate-700 shadow-sm'
                            aria-label='Trạng thái thanh toán'
                          >
                            {paymentStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Form.Select>

                          {paymentLoading && (
                            <div className='text-center text-[11px] font-semibold text-blue-600'>
                              Đang cập nhật thanh toán...
                            </div>
                          )}
                        </div>
                      </td>

                      <td className='p-3'>
                        <div className='d-flex flex-column gap-2'>
                          <Form.Select
                            value={orderStatusDraft[id] || order.status}
                            onChange={(event) =>
                              handleOrderStatusChange(id, event.target.value)
                            }
                            disabled={
                              orderLoading || paymentLoading || finalOrderStatus
                            }
                            className='!rounded-lg border-slate-200 text-sm font-bold text-slate-700 shadow-sm'
                            aria-label='Trạng thái đơn hàng'
                          >
                            {orderStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Form.Select>

                          {orderLoading && (
                            <div className='text-center text-[11px] font-semibold text-blue-600'>
                              Đang cập nhật đơn hàng...
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan='5'
                      className='py-5 text-center text-slate-500'
                    >
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showCancelModal} onHide={handleCloseCancelModal} centered>
        <Modal.Header closeButton className='border-0 pb-0'>
          <Modal.Title className='h5 font-black text-slate-900'>
            Xác nhận hủy đơn hàng
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className='mb-3 text-sm text-slate-600'>
            Vui lòng nhập lý do hủy đơn. Lý do sẽ được lưu và gửi email
            thông báo cho khách hàng.
          </p>

          <Form.Group>
            <Form.Control
              as='textarea'
              rows={3}
              placeholder='Nhập lý do hủy...'
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className='shadow-none'
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer className='border-0 pt-0'>
          <Button variant='light' onClick={handleCloseCancelModal}>
            Đóng
          </Button>
          <Button
            variant='danger'
            onClick={handleConfirmCancel}
            disabled={!cancelReason.trim()}
          >
            Xác nhận hủy
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default OrderManagementPage
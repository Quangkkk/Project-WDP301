import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Form from 'react-bootstrap/Form'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import SelectField from '../../components/atoms/SelectField'
import StatusBadge from '../../components/atoms/StatusBadge'

import { getErrorMessage } from '../../services/api'
import { getOrders, updateOrder, cancelOrder } from '../../services/order.service'
import { confirmBankTransferPayment } from '../../services/payment.service'
import { formatDate, formatOrderCode, getId, pickArray } from '../../utils/format'

const orderStatusOptions = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

function getPaymentMethodLabel(method) {
  const map = {
    cod: 'COD',
    bank_transfer: 'Bank Transfer',
    zalopay: 'ZaloPay',
  }

  return map[method] || method || '-'
}

function OrderManagementPage() {
  const [orders, setOrders] = useState([])
  const [statusDraft, setStatusDraft] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState('')

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelOrderId, setCancelOrderId] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const load = async () => {
    try {
      setError('')

      const response = await getOrders()
      const data = pickArray(response, [])

      setOrders(data)
      setStatusDraft(
        Object.fromEntries(
          data.map((order) => [getId(order), order.status || 'pending']),
        ),
      )
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được orders'))
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSave = async (orderId) => {
    const originalOrder = orders.find(o => getId(o) === orderId)
    if (statusDraft[orderId] === 'cancelled' && originalOrder?.status !== 'cancelled') {
      setCancelOrderId(orderId)
      setShowCancelModal(true)
      return
    }

    try {
      setLoadingId(orderId)
      setError('')
      setMessage('')

      await updateOrder(orderId, {
        status: statusDraft[orderId],
      })

      setMessage('Đã cập nhật trạng thái đơn hàng.')
      await load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được trạng thái'))
    } finally {
      setLoadingId('')
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Vui lòng nhập lý do hủy đơn')
      setShowCancelModal(false)
      return
    }

    try {
      setLoadingId(cancelOrderId)
      setError('')
      setMessage('')
      setShowCancelModal(false)

      await cancelOrder(cancelOrderId, cancelReason.trim())

      setMessage('Đã hủy đơn hàng và gửi email thông báo cho khách.')
      setCancelReason('')
      await load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không hủy được đơn hàng'))
    } finally {
      setLoadingId('')
    }
  }

  const handleConfirmBank = async (orderId) => {
    try {
      setLoadingId(orderId)
      setError('')
      setMessage('')

      await confirmBankTransferPayment(orderId)

      setMessage('Đã xác nhận thanh toán chuyển khoản.')
      await load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không xác nhận được thanh toán chuyển khoản'))
    } finally {
      setLoadingId('')
    }
  }

  return (
    <DashboardLayout
      title='Quản lý đơn hàng'
      description='Nhân viên và quản lý xử lý đơn hàng, cập nhật trạng thái và thanh toán.'
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card className='card-surface'>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead>
              <tr>
                <th className='p-3'>Đơn hàng</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th style={{ minWidth: 320 }}>Cập nhật</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const id = getId(order)
                const isBankTransfer = order.payment_method === 'bank_transfer'
                const isPaid = order.payment_status === 'paid'

                return (
                  <tr key={id}>
                    <td className='p-3'>
                      <b>{formatOrderCode(order)}</b>
                      <br />
                      <span className='text-sm text-slate-500'>
                        {formatDate(order.created_at)}
                      </span>
                    </td>

                    <td>
                      <span className='font-bold text-slate-900'>
                        {order.user_id?.name || order.receiver_name}
                      </span>
                      <br />
                      <span className='text-sm text-slate-500'>
                        {order.receiver_phone}
                      </span>
                    </td>

                    <td>
                      <PriceText
                        value={order.total_amount}
                        className='font-black text-orange-600'
                      />
                    </td>

                    <td>
                      <div className='d-flex flex-column gap-1'>
                        <span className='text-sm font-bold text-slate-700'>
                          {getPaymentMethodLabel(order.payment_method)}
                        </span>

                        <StatusBadge value={order.payment_status} />
                      </div>
                    </td>

                    <td>
                      <StatusBadge value={order.status} />
                    </td>

                    <td>
                      <div className='d-flex flex-column gap-2'>
                        <div className='d-flex gap-2 align-items-center'>
                          <SelectField
                            value={statusDraft[id] || order.status}
                            options={orderStatusOptions}
                            onChange={(event) =>
                              setStatusDraft((prev) => ({
                                ...prev,
                                [id]: event.target.value,
                              }))
                            }
                          />
                        </div>

                        <div className='d-flex flex-wrap gap-2'>
                          <Button
                            size='sm'
                            onClick={() => handleSave(id)}
                            isLoading={loadingId === id}
                          >
                            Lưu
                          </Button>

                          {isBankTransfer && !isPaid && (
                            <Button
                              size='sm'
                              variant='success'
                              onClick={() => handleConfirmBank(id)}
                              isLoading={loadingId === id}
                            >
                              Xác nhận đã chuyển khoản
                            </Button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Cancel Order Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton className='border-0 pb-0'>
          <Modal.Title className='h5 font-black text-slate-900'>Xác nhận hủy đơn hàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className='text-sm text-slate-600 mb-3'>
            Vui lòng nhập lý do hủy đơn (bắt buộc). Lý do này sẽ được lưu lại và gửi email thông báo cho khách hàng.
          </p>
          <Form.Group>
            <Form.Control
              as='textarea'
              rows={3}
              placeholder='Nhập lý do hủy...'
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className='shadow-none'
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className='border-0 pt-0'>
          <Button variant='light' onClick={() => setShowCancelModal(false)}>
            Đóng
          </Button>
          <Button variant='danger' onClick={handleConfirmCancel} disabled={!cancelReason.trim()}>
            Xác nhận Hủy
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default OrderManagementPage
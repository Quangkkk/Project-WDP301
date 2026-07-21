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

      <Card className='card-surface border-0 shadow-sm' style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead style={{ backgroundColor: '#f8fafc' }}>
              <tr>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0'>Đơn hàng</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0'>Khách hàng</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0 text-center'>Tổng tiền</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0 text-center'>Thanh toán</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0 text-center'>Trạng thái</th>
                <th className='p-4 text-xs font-black text-slate-400 uppercase tracking-wider border-0 text-center' style={{ minWidth: '280px' }}>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const id = getId(order)
                const isBankTransfer = order.payment_method === 'bank_transfer'
                const isPaid = order.payment_status === 'paid'

                return (
                  <tr key={id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className='p-4'>
                      <div className='d-flex flex-column'>
                        <span className='font-black text-slate-900 text-base'>
                          {formatOrderCode(order)}
                        </span>
                        <span className='text-xs font-bold text-slate-400 mt-1'>
                          {formatDate(order.created_at)}
                        </span>
                      </div>
                    </td>

                    <td className='p-4'>
                      <div className='d-flex flex-column'>
                        <span className='font-black text-slate-800'>
                          {order.user_id?.name || order.receiver_name}
                        </span>
                        <span className='text-xs font-bold text-slate-500 mt-1 d-flex align-items-center gap-1'>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          {order.receiver_phone}
                        </span>
                      </div>
                    </td>

                    <td className='p-4 text-center'>
                      <div className='d-inline-flex px-3 py-1 bg-orange-50 rounded-lg border border-orange-100'>
                        <PriceText
                          value={order.total_amount}
                          className='font-black text-orange-600 text-base'
                        />
                      </div>
                    </td>

                    <td className='p-4 text-center'>
                      <div className='d-flex flex-column align-items-center gap-2'>
                        <span className='text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-md uppercase'>
                          {getPaymentMethodLabel(order.payment_method)}
                        </span>
                        <StatusBadge value={order.payment_status} />
                      </div>
                    </td>

                    <td className='p-4 text-center'>
                      <StatusBadge value={order.status} />
                    </td>

                    <td className='p-4'>
                      <div className='d-flex flex-column align-items-center gap-2'>
                        <div style={{ width: '100%', maxWidth: '200px' }}>
                          <SelectField
                            value={statusDraft[id] || order.status}
                            options={orderStatusOptions}
                            onChange={(event) =>
                              setStatusDraft((prev) => ({
                                ...prev,
                                [id]: event.target.value,
                              }))
                            }
                            className='form-select-sm border-slate-200 shadow-sm font-bold text-slate-700'
                          />
                        </div>

                        <div className='d-flex gap-2 w-100 justify-content-center'>
                          <Button
                            size='sm'
                            onClick={() => handleSave(id)}
                            isLoading={loadingId === id}
                            className='px-4'
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
                              Đã nhận tiền
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
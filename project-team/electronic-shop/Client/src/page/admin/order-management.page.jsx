import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import Form from 'react-bootstrap/Form'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import SelectField from '../../components/atoms/SelectField'
import StatusBadge from '../../components/atoms/StatusBadge'

import { getErrorMessage } from '../../services/api'
import { getOrders, updateOrder } from '../../services/order.service'
import { confirmBankTransferPayment } from '../../services/payment.service'
import { formatDate, getId, pickArray } from '../../utils/format'

const orderStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const paymentStatusOptions = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
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
  const [paymentDraft, setPaymentDraft] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState('')

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
      setPaymentDraft(
        Object.fromEntries(
          data.map((order) => [getId(order), order.payment_status || 'unpaid']),
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
    try {
      setLoadingId(orderId)
      setError('')
      setMessage('')

      await updateOrder(orderId, {
        status: statusDraft[orderId],
        payment_status: paymentDraft[orderId],
      })

      setMessage('Đã cập nhật trạng thái đơn hàng.')
      await load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được trạng thái'))
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
      title='Order Management'
      description='Staff/Manager xử lý order, cập nhật trạng thái đơn hàng và thanh toán.'
    >
      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      <Card className='card-surface'>
        <Card.Body className='p-0'>
          <Table responsive hover className='mb-0 align-middle'>
            <thead>
              <tr>
                <th className='p-3'>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ minWidth: 320 }}>Update</th>
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
                      <b>#{id.slice(-6).toUpperCase()}</b>
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
                          <Form.Select
                            size='sm'
                            className='rounded-2 shadow-sm border-slate-200'
                            value={statusDraft[id] || order.status}
                            onChange={(event) =>
                              setStatusDraft((prev) => ({
                                ...prev,
                                [id]: event.target.value,
                              }))
                            }
                          >
                            {orderStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </Form.Select>

                          <Form.Select
                            size='sm'
                            className='rounded-2 shadow-sm border-slate-200'
                            value={paymentDraft[id] || order.payment_status}
                            onChange={(event) =>
                              setPaymentDraft((prev) => ({
                                ...prev,
                                [id]: event.target.value,
                              }))
                            }
                          >
                            {paymentStatusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </Form.Select>
                        </div>

                        <div className='d-flex flex-wrap gap-2'>
                          <Button
                            size='sm'
                            onClick={() => handleSave(id)}
                            isLoading={loadingId === id}
                          >
                            Save
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
    </DashboardLayout>
  )
}

export default OrderManagementPage
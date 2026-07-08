import { useEffect, useState } from 'react'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import PriceText from '../../components/atoms/PriceText'
import SelectField from '../../components/atoms/SelectField'
import StatusBadge from '../../components/atoms/StatusBadge'
import { getErrorMessage } from '../../services/api'
import { getOrders, updateOrder } from '../../services/order.service'
import { formatDate, getId, pickArray } from '../../utils/format'

const orderStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function OrderManagementPage() {
  const [orders, setOrders] = useState([])
  const [statusDraft, setStatusDraft] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const response = await getOrders()
      const data = pickArray(response, [])
      setOrders(data)
      setStatusDraft(Object.fromEntries(data.map((order) => [getId(order), order.status || 'pending'])))
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được orders'))
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (orderId) => {
    try {
      await updateOrder(orderId, { status: statusDraft[orderId] })
      setMessage('Đã cập nhật trạng thái đơn hàng.')
      load()
    } catch (error) {
      setError(getErrorMessage(error, 'Không cập nhật được trạng thái'))
    }
  }

  return (
    <DashboardLayout title='Order Management' description='Staff/Manager xử lý order và cập nhật shipping status.'>
      <Alert type='danger'>{error}</Alert><Alert type='success'>{message}</Alert>
      <Card className='card-surface'><Card.Body className='p-0'>
        <Table responsive hover className='mb-0'>
          <thead><tr><th className='p-3'>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Update</th></tr></thead>
          <tbody>{orders.map((order) => {
            const id = getId(order)
            return <tr key={id}><td className='p-3'><b>#{id.slice(-6).toUpperCase()}</b><br /><span className='text-sm text-slate-500'>{formatDate(order.created_at)}</span></td><td>{order.user_id?.name || order.receiver_name}<br /><span className='text-sm text-slate-500'>{order.receiver_phone}</span></td><td><PriceText value={order.total_amount} className='font-black text-blue-600' /></td><td><StatusBadge value={order.status} /></td><td><div className='d-flex gap-2 align-items-center'><SelectField value={statusDraft[id] || order.status} options={orderStatusOptions} onChange={(e) => setStatusDraft((p) => ({ ...p, [id]: e.target.value }))} /><Button size='sm' onClick={() => handleSave(id)}>Save</Button></div></td></tr>
          })}</tbody>
        </Table>
      </Card.Body></Card>
    </DashboardLayout>
  )
}

export default OrderManagementPage

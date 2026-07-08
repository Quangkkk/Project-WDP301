import Card from 'react-bootstrap/Card'
import PriceText from '../atoms/PriceText'
import StatusBadge from '../atoms/StatusBadge'
import { formatDate, getId } from '../../utils/format'

function OrderCard({ order, onCancel }) {
  const items = order.items || []
  const canCancel = ['pending', 'confirmed', 'processing'].includes(String(order.status).toLowerCase())

  return (
    <Card className='card-surface mb-3'>
      <Card.Body className='p-4'>
        <div className='d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3'>
          <div>
            <p className='mb-1 text-sm font-bold text-slate-400'>ORDER #{String(getId(order)).slice(-6).toUpperCase()}</p>
            <h3 className='mb-0 text-xl font-black text-slate-950'>{formatDate(order.created_at)}</h3>
          </div>
          <div className='d-flex flex-wrap gap-2 align-items-start'>
            <StatusBadge value={order.status} />
            <StatusBadge value={order.payment_status} />
          </div>
        </div>
        <div className='rounded-4 bg-slate-50 p-3 mb-3'>
          {items.length === 0 ? <p className='mb-0 text-sm text-slate-500'>No item detail.</p> : items.map((item) => (
            <div key={getId(item)} className='d-flex justify-content-between gap-3 border-bottom py-2 last:border-0'>
              <span className='text-sm font-semibold text-slate-700'>{item.product_id?.name || 'Product'} x {item.quantity}</span>
              <PriceText value={item.subtotal || Number(item.unit_price || 0) * Number(item.quantity || 0)} className='text-sm font-bold text-slate-950' />
            </div>
          ))}
        </div>
        <div className='d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3'>
          <p className='mb-0 text-sm text-slate-500'>{order.receiver_name} • {order.receiver_phone} • {order.address_address_line}</p>
          <div className='d-flex align-items-center gap-3'>
            <PriceText value={order.total_amount} className='text-xl font-black text-blue-600' />
            {canCancel && <button type='button' className='rounded-pill border-0 bg-red-50 px-4 py-2 text-sm font-bold text-red-600' onClick={() => onCancel?.(getId(order))}>Cancel</button>}
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

export default OrderCard

import { useState } from 'react'
import Card from 'react-bootstrap/Card'
import PriceText from '../atoms/PriceText'
import StatusBadge from '../atoms/StatusBadge'
import FeedbackModal from './FeedbackModal'
import { formatDate, getId } from '../../utils/format'

function OrderCard({ order, onCancel, onReviewed }) {
  const items = order.items || []
  const status = String(order.status).toLowerCase()
  const canCancel = ['pending', 'confirmed', 'processing'].includes(status)
  const isCompleted = status === 'completed'

  const [feedbackItem, setFeedbackItem] = useState(null) // { productId, productName }

  const handleFeedbackSuccess = () => {
    setFeedbackItem(null)
    onReviewed?.()
  }

  return (
    <>
      <Card className='card-surface mb-3'>
        <Card.Body className='p-4'>
          {/* Header: order ID + date + status badges */}
          <div className='d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3'>
            <div>
              <p className='mb-1 text-sm font-bold text-slate-400'>
                ORDER #{String(getId(order)).slice(-6).toUpperCase()}
              </p>
              <h3 className='mb-0 text-xl font-black text-slate-950'>
                {formatDate(order.created_at)}
              </h3>
            </div>
            <div className='d-flex flex-wrap gap-2 align-items-start'>
              <StatusBadge value={order.status} />
              <StatusBadge value={order.payment_status} />
            </div>
          </div>

          {/* Items */}
          <div className='rounded-4 bg-slate-50 p-3 mb-3'>
            {items.length === 0 ? (
              <p className='mb-0 text-sm text-slate-500'>No item detail.</p>
            ) : (
              items.map((item) => {
                const productId =
                  getId(item.product_id) || getId(item.product) || null
                const productName =
                  item.product_id?.name || item.product?.name || 'Sản phẩm'

                return (
                  <div
                    key={getId(item)}
                    className='d-flex flex-column flex-md-row justify-content-between gap-2 border-bottom py-2 last:border-0'
                  >
                    {/* Name + price */}
                    <div className='d-flex align-items-center justify-content-between gap-3 flex-grow-1'>
                      <span className='text-sm font-semibold text-slate-700'>
                        {productName} x {item.quantity}
                      </span>
                      <PriceText
                        value={
                          item.subtotal ||
                          Number(item.unit_price || 0) * Number(item.quantity || 0)
                        }
                        className='text-sm font-bold text-slate-950'
                      />
                    </div>

                    {/* Feedback button – only when order is completed */}
                    {isCompleted && productId && (
                      <button
                        type='button'
                        className='rounded-pill border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100 flex-shrink-0'
                        onClick={() =>
                          setFeedbackItem({ productId, productName })
                        }
                      >
                        ⭐ Đánh giá
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer: address + total + cancel */}
          <div className='d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3'>
            <p className='mb-0 text-sm text-slate-500'>
              {order.receiver_name} • {order.receiver_phone} •{' '}
              {order.address_address_line}
            </p>
            <div className='d-flex align-items-center gap-3'>
              <PriceText
                value={order.total_amount}
                className='text-xl font-black text-blue-600'
              />
              {canCancel && (
                <button
                  type='button'
                  className='rounded-pill border-0 bg-red-50 px-4 py-2 text-sm font-bold text-red-600'
                  onClick={() => onCancel?.(getId(order))}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Feedback Modal */}
      {feedbackItem && (
        <FeedbackModal
          show={Boolean(feedbackItem)}
          onHide={() => setFeedbackItem(null)}
          orderId={getId(order)}
          productId={feedbackItem.productId}
          productName={feedbackItem.productName}
          onSuccess={handleFeedbackSuccess}
        />
      )}
    </>
  )
}

export default OrderCard

import { useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import { createReview } from '../../services/review.service'
import { getErrorMessage } from '../../services/api'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { getId } from '../../utils/format'

function RatingInput({ value, onChange }) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className='d-flex align-items-center gap-1'>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type='button'
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className='border-0 bg-transparent p-0 transition'
          style={{ fontSize: 32, lineHeight: 1, cursor: 'pointer' }}
          aria-label={`${star} sao`}
        >
          <span
            style={{
              color: star <= (hovered || value) ? '#f59e0b' : '#d1d5db',
              transition: 'color 0.15s',
            }}
          >
            ★
          </span>
        </button>
      ))}
      {value > 0 && (
        <span className='ms-2 text-sm font-bold text-amber-600'>
          {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][value]}
        </span>
      )}
    </div>
  )
}

/**
 * FeedbackModal – modal cho phép customer đánh giá 1 sản phẩm trong đơn hàng đã hoàn thành.
 * Props:
 *   show          {boolean}  – hiển thị modal
 *   onHide        {Function} – callback đóng modal
 *   orderId       {string}   – ID đơn hàng
 *   productId     {string}   – ID sản phẩm
 *   productName   {string}   – Tên sản phẩm (hiển thị UI)
 *   onSuccess     {Function} – callback sau khi submit thành công
 */
function FeedbackModal({ show, onHide, orderId, productId, productName, onSuccess }) {
  const user = getCurrentUser()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setRating(0)
    setComment('')
    setError('')
    setIsSubmitting(false)
    onHide?.()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!rating) {
      setError('Vui lòng chọn số sao đánh giá.')
      return
    }

    if (!user) {
      setError('Bạn cần đăng nhập để đánh giá.')
      return
    }

    try {
      setIsSubmitting(true)
      await createReview({
        user_id: getUserId(user),
        order_id: orderId,
        product_id: productId,
        rating,
        comment: comment.trim() || null,
      })
      handleClose()
      onSuccess?.()
    } catch (err) {
      const msg = getErrorMessage(err, 'Không gửi được đánh giá. Vui lòng thử lại.')
      // Nếu đã đánh giá rồi (409 Conflict) thì thông báo thân thiện
      if (err?.response?.status === 409) {
        setError('Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi.')
      } else {
        setError(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={show} onHide={handleClose} centered size='md'>
      <Modal.Header className='border-0 pb-0 px-4 pt-4'>
        <div>
          <p className='mb-1 text-xs font-black uppercase tracking-[0.2em] text-orange-500'>
            Đánh giá sản phẩm
          </p>
          <h2 className='mb-0 text-xl font-black text-slate-900'>{productName || 'Sản phẩm'}</h2>
        </div>
        <button
          type='button'
          onClick={handleClose}
          className='ms-auto border-0 bg-transparent p-2 text-slate-400 hover:text-slate-700'
          aria-label='Đóng'
        >
          ✕
        </button>
      </Modal.Header>

      <Modal.Body className='px-4 pb-0 pt-3'>
        {error && (
          <div className='mb-3 rounded-3 bg-red-50 px-3 py-2 text-sm font-bold text-red-600'>
            {error}
          </div>
        )}

        <form id='feedback-form' onSubmit={handleSubmit}>
          {/* Rating */}
          <div className='mb-4'>
            <p className='mb-2 font-bold text-slate-700'>Mức độ hài lòng *</p>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          {/* Comment */}
          <div className='mb-3'>
            <label htmlFor='feedback-comment' className='mb-2 d-block font-bold text-slate-700'>
              Nội dung đánh giá
            </label>
            <textarea
              id='feedback-comment'
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder='Chia sẻ trải nghiệm của bạn về sản phẩm này...'
              className='w-100 rounded-3 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400 focus:bg-white'
              style={{ resize: 'vertical', minHeight: 96, transition: 'border-color 0.15s' }}
            />
          </div>
        </form>
      </Modal.Body>

      <Modal.Footer className='border-0 px-4 pb-4 pt-2 d-flex gap-2'>
        <button
          type='button'
          onClick={handleClose}
          disabled={isSubmitting}
          className='rounded-pill border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50'
        >
          Hủy
        </button>
        <button
          type='submit'
          form='feedback-form'
          disabled={isSubmitting || !rating}
          className='rounded-pill border-0 bg-orange-500 px-6 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50'
        >
          {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default FeedbackModal

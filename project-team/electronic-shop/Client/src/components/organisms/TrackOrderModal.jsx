import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import Alert from '../atoms/Alert'
import Button from '../atoms/Button'
import TextField from '../atoms/TextField'

import { getErrorMessage } from '../../services/api'
import { trackOrder } from '../../services/order.service'
import { getId } from '../../utils/format'

const getGuestLookupStorageKey = (orderId) =>
  `guest_order_lookup_${orderId}`

function normalizeTrackResult(response) {
  const payload = response?.data || response || {}

  return {
    order: payload?.order || null,
    items: Array.isArray(payload?.items) ? payload.items : [],
  }
}

function TrackOrderModal({ show, onHide }) {
  const navigate = useNavigate()

  const [orderCode, setOrderCode] = useState('')
  const [contact, setContact] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    setOrderCode('')
    setContact('')
    setError('')
    setIsLoading(false)
    onHide?.()
  }

  useEffect(() => {
    if (!show) return undefined

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [show])

  const handleTrack = async (event) => {
    event.preventDefault()

    const normalizedOrderCode = orderCode.trim()
    const normalizedContact = contact.trim()

    if (!normalizedOrderCode || !normalizedContact) {
      setError('Vui lòng nhập mã đơn hàng và email hoặc số điện thoại.')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await trackOrder({
        order_code: normalizedOrderCode,
        contact: normalizedContact,
      })

      const { order, items } = normalizeTrackResult(response)
      const orderId = getId(order)

      if (!order || !orderId) {
        setError('Không tìm thấy đơn hàng phù hợp với thông tin đã nhập.')
        return
      }

      const lookup = {
        order_code: order.order_code || normalizedOrderCode,
        contact: normalizedContact,
      }

      try {
        sessionStorage.setItem(
          getGuestLookupStorageKey(orderId),
          JSON.stringify(lookup),
        )
      } catch {
        // Vẫn cho phép chuyển trang bằng location.state nếu trình duyệt chặn storage.
      }

      onHide?.()

      navigate(`/track-order/${orderId}`, {
        state: {
          order,
          items,
          lookup,
        },
      })
    } catch (err) {
      if (err?.response?.status === 429) {
        setError('Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 1 phút.')
      } else {
        setError(
          getErrorMessage(
            err,
            'Không tìm thấy đơn hàng hoặc thông tin xác nhận không khớp.',
          ),
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!show) return null

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='track-order-title'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose()
        }
      }}
    >
      <div className='relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden !rounded-2xl bg-white shadow-2xl'>
        <div className='flex items-center justify-between border-b border-slate-100 px-6 py-4'>
          <h2
            id='track-order-title'
            className='mb-0 text-lg font-black text-slate-900'
          >
            Tra cứu đơn hàng
          </h2>

          <button
            type='button'
            onClick={handleClose}
            className='border-0 bg-transparent p-2 text-slate-400 transition-colors hover:text-slate-700'
            aria-label='Đóng cửa sổ tra cứu đơn hàng'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='overflow-y-auto px-6 pt-3'>
          <form onSubmit={handleTrack}>
            <p className='mb-2 text-sm leading-relaxed text-slate-600'>
              Nhập mã đơn hàng cùng số điện thoại hoặc email đã dùng khi đặt
              hàng để tra cứu.
            </p>

            <Alert type='danger' className='mb-3'>
              {error}
            </Alert>

            <TextField
              label='Mã đơn hàng'
              id='orderCode'
              value={orderCode}
              onChange={(event) => {
                setOrderCode(event.target.value)
                setError('')
              }}
              placeholder='VD: TS-835F3AD4 hoặc 835F3AD4'
              className='mb-4'
              autoComplete='off'
            />

            <TextField
              label='Số điện thoại hoặc email'
              id='contact'
              value={contact}
              onChange={(event) => {
                setContact(event.target.value)
                setError('')
              }}
              placeholder='Nhập số điện thoại hoặc email'
              className='mb-6'
              autoComplete='email'
            />

            <Button
              type='submit'
              className='w-full py-3'
              isLoading={isLoading}
            >
              Tra cứu
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TrackOrderModal
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

import Button from '../atoms/Button'
import TextField from '../atoms/TextField'
import StatusBadge from '../atoms/StatusBadge'
import Alert from '../atoms/Alert'

import { trackOrder } from '../../services/order.service'
import { getErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

function TrackOrderModal({ show, onHide }) {
  const [orderCode, setOrderCode] = useState('')
  const [contact, setContact] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderResult, setOrderResult] = useState(null)

  // Dong modal khi nhan ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    if (show) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden' // block scroll
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [show])

  if (!show) return null

  const handleTrack = async (e) => {
    e.preventDefault()
    if (!orderCode.trim() || !contact.trim()) {
      setError('Vui lòng nhập mã đơn hàng và email/số điện thoại.')
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setOrderResult(null)

      const result = await trackOrder({
        order_code: orderCode.trim(),
        contact: contact.trim(),
      })

      if (result && result.data) {
        setOrderResult(result.data)
      } else {
        setError('Không tìm thấy đơn hàng nào khớp với thông tin đã nhập.')
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Bạn đã tra cứu quá nhiều lần. Vui lòng thử lại sau 1 phút.')
      } else {
        setError(getErrorMessage(err, 'Không tìm thấy đơn hàng hoặc thông tin không khớp.'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setOrderCode('')
    setContact('')
    setError('')
    setOrderResult(null)
    onHide()
  }

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4'>
      <div 
        className='relative w-full max-w-md bg-white !rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between px-3 pt-4 border-b border-slate-100'>
          <h2 className='text-lg font-black text-slate-900'>Tra cứu đơn hàng</h2>
          <button 
            onClick={handleClose}
            className='p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 !rounded-full transition-colors focus:outline-none'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='px-6 py-3 overflow-y-auto'>
          {!orderResult ? (
            <form onSubmit={handleTrack}>
              <p className='text-sm text-slate-600 mb-5 leading-relaxed'>
                Nhập mã đơn hàng và số điện thoại (hoặc email) lúc đặt hàng để xem trạng thái đơn mới nhất.
              </p>
              
              {error && <div className="mb-4"><Alert type='danger'>{error}</Alert></div>}
              
              <TextField
                label='Mã đơn hàng'
                id='orderCode'
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder='VD: 64C8A2F...'
                className='mb-4'
              />
              <TextField
                label='SĐT hoặc Email'
                id='contact'
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder='Nhập số điện thoại hoặc email'
                className='mb-6'
              />
              <Button type='submit' className='w-full py-3' isLoading={isLoading}>
                Tra Cứu
              </Button>
            </form>
          ) : (
            <div className='bg-slate-50 p-5 !rounded-xl border border-slate-200'>
              <div className='flex justify-between items-center mb-4 pb-4 border-b border-slate-200'>
                <span className='font-bold text-slate-700'>Trạng thái:</span>
                <StatusBadge value={orderResult.status} />
              </div>
              <div className='mb-3 flex justify-between'>
                <span className='text-sm text-slate-500'>Mã đơn hàng:</span>
                <span className='font-bold text-slate-900'>#{orderResult._id?.slice(-6).toUpperCase()}</span>
              </div>
              <div className='mb-3 flex justify-between'>
                <span className='text-sm text-slate-500'>Ngày đặt:</span>
                <span className='font-bold text-slate-900'>{formatDate(orderResult.created_at)}</span>
              </div>
              <div className='mb-3 flex justify-between'>
                <span className='text-sm text-slate-500'>Người nhận:</span>
                <span className='font-bold text-slate-900 text-right'>{orderResult.receiver_name}</span>
              </div>
              <div className='mb-6 flex justify-between items-center pt-3 border-t border-slate-200'>
                <span className='text-sm font-bold text-slate-700'>Tổng tiền:</span>
                <span className='text-xl font-black text-orange-600'>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(orderResult.total_amount)}
                </span>
              </div>
              <Button variant='ghost' className='w-full py-2 bg-white border border-slate-200 shadow-sm' onClick={() => setOrderResult(null)}>
                Tra cứu đơn khác
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute inset-0 -z-10" onClick={handleClose}></div>
    </div>
  )
}

export default TrackOrderModal

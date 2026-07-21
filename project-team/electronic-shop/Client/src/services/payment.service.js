import api from './api'

const getGuestHeaders = (guestOrderToken = '') => {
  const token = String(guestOrderToken || '').trim()

  if (!token) {
    return {}
  }

  return {
    'X-Guest-Order-Token': token,
  }
}

export const getPaymentByOrder = async (
  orderId,
  guestOrderToken = '',
) => {
  const response = await api.get(`/payment/order/${orderId}`, {
    headers: getGuestHeaders(guestOrderToken),
  })

  return response.data
}

export const createBankTransferPayment = async (
  orderId,
  guestOrderToken = '',
) => {
  const response = await api.post(
    '/payment/bank-transfer',
    {
      order_id: orderId,
    },
    {
      headers: getGuestHeaders(guestOrderToken),
    },
  )

  return response.data
}

export const createZaloPayPayment = async (
  orderId,
  guestOrderToken = '',
) => {
  const response = await api.post(
    '/payment/zalopay/create',
    {
      order_id: orderId,
    },
    {
      headers: getGuestHeaders(guestOrderToken),
    },
  )

  return response.data
}

export const confirmBankTransferPayment = async (orderId) => {
  const response = await api.patch(`/payment/order/${orderId}/confirm-bank`)
  return response.data
}
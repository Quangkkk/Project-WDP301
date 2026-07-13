import api from './api'

export const getPaymentByOrder = async (orderId) => {
  const response = await api.get(`/payment/order/${orderId}`)
  return response.data
}

export const createBankTransferPayment = async (orderId) => {
  const response = await api.post('/payment/bank-transfer', {
    order_id: orderId,
  })

  return response.data
}

export const createZaloPayPayment = async (orderId) => {
  const response = await api.post('/payment/zalopay/create', {
    order_id: orderId,
  })

  return response.data
}

export const confirmBankTransferPayment = async (orderId) => {
  const response = await api.patch(`/payment/order/${orderId}/confirm-bank`)
  return response.data
}
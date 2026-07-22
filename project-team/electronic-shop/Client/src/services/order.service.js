import api from './api'

export const createOrder = async (payload) => {
  const response = await api.post('/order', payload)
  return response.data
}

export const getOrders = async (params = {}) => {
  const response = await api.get('/order', { params })
  return response.data
}

export const getOrderById = async (id) => {
  const response = await api.get(`/order/${id}`)
  return response.data
}

export const updateOrder = async (id, payload) => {
  const response = await api.put(`/order/${id}`, payload)
  return response.data
}

export const cancelOrder = async (id, cancel_reason) => {
  const response = await api.patch(`/order/${id}/cancel`, { cancel_reason })
  return response.data
}

export const trackOrder = async (payload) => {
  const response = await api.post('/order/track', payload)
  return response.data
}

export const createReturnRequest = async (orderId, payload) => {
  const response = await api.post(`/order/${orderId}/return-request`, payload)
  return response.data
}

export const getReturnRequests = async (params = {}) => {
  const response = await api.get('/order/return-requests', { params })
  return response.data
}

export const reviewReturnRequest = async (orderId, payload) => {
  const response = await api.patch(
    `/order/${orderId}/return-request/review`,
    payload,
  )

  return response.data
}
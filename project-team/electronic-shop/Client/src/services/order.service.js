import api from './api'

export const createOrder = async (payload) => {
  const response = await api.post('/order', payload)
  return response.data
}

export const getMyOrders = async (params = {}) => {
  const response = await api.get('/order/my', { params })
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

export const cancelOrder = async (id) => {
  const response = await api.patch(`/order/${id}/cancel`)
  return response.data
}

import api from './api'

export const getShippingMethods = async (params = {}) => {
  const response = await api.get('/shipping-method', {
    params,
  })

  return response.data
}

export const createShippingMethod = async (payload) => {
  const response = await api.post('/shipping-method', payload)
  return response.data
}

export const updateShippingMethod = async (id, payload) => {
  const response = await api.put(`/shipping-method/${id}`, payload)
  return response.data
}

export const deleteShippingMethod = async (id) => {
  const response = await api.delete(`/shipping-method/${id}`)
  return response.data
}
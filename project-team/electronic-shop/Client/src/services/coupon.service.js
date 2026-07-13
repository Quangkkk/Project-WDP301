import api from './api'

export const getCoupons = async () => {
  const response = await api.get('/coupon')
  return response.data
}

export const validateCoupon = async (payload) => {
  const response = await api.post('/coupon/validate', payload)
  return response.data
}

export const createCoupon = async (payload) => {
  const response = await api.post('/coupon', payload)
  return response.data
}

export const updateCoupon = async (id, payload) => {
  const response = await api.put(`/coupon/${id}`, payload)
  return response.data
}

export const deleteCoupon = async (id) => {
  const response = await api.delete(`/coupon/${id}`)
  return response.data
}

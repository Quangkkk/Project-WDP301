import api from './api'

export const getReviews = async (params = {}) => {
  const response = await api.get('/review', { params })
  return response.data
}

export const createReview = async (payload) => {
  const response = await api.post('/review', payload)
  return response.data
}

export const deleteReview = async (id) => {
  const response = await api.delete(`/review/${id}`)
  return response.data
}

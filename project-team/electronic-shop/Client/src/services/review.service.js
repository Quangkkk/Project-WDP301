import api from './api'

export const getReviews = async (params = {}) => {
  const productId =
    params.product_id || params.productId || params.id || params.product

  if (!productId) {
    throw new Error('product_id is required to load reviews')
  }

  const query = { ...params }

  delete query.product_id
  delete query.productId
  delete query.id
  delete query.product
  delete query.status

  const response = await api.get(`/product/${productId}/reviews`, {
    params: query,
  })

  return response.data || {
    reviews: [],
    pagination: { total: 0, page: 1, limit: 10, pages: 0 },
    stats: { average_rating: 0, total_review: 0 },
  }
}


export const getMyReviews = async (params = {}) => {
  const response = await api.get('/review/mine', {
    params,
  })

  const data = response?.data?.data

  return Array.isArray(data) ? data : []
}

export const createReview = async (payload) => {
  const response = await api.post('/review', payload)
  return response.data
}

export const updateReview = async (id, payload) => {
  const response = await api.put(`/review/${id}`, payload)
  return response.data
}

export const deleteReview = async (id) => {
  const response = await api.delete(`/review/${id}`)
  return response.data
}
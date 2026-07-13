import api from './api'

export const getWishlist = async (params = {}) => {
  const response = await api.get('/wishlist', { params })
  return response.data
}

export const addToWishlist = async (payload) => {
  const body = {
    user_id: payload.user_id,
    product_id: payload.product_id,
  }

  try {
    const response = await api.post('/wishlist', body)
    return response.data
  } catch (error) {
    if (error?.response?.status === 404) {
      const response = await api.post('/wishlist/item', body)
      return response.data
    }

    throw error
  }
}
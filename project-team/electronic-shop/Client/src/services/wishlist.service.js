import api from './api'

export const getWishlist = async (params = {}) => {
  const response = await api.get('/wishlist', { params })
  return response.data
}

export const checkWishlist = async (params = {}) => {
  const response = await api.get('/wishlist/check', { params })
  return response.data
}

export const addToWishlist = async (payload) => {
  const body = {
    user_id: payload.user_id,
    product_id: payload.product_id,
  }

  const response = await api.post('/wishlist', body)
  return response.data
}

export const toggleWishlist = async (payload) => {
  const body = {
    user_id: payload.user_id,
    product_id: payload.product_id,
  }

  const response = await api.post('/wishlist/toggle', body)
  return response.data
}

export const removeWishlistById = async (id) => {
  const response = await api.delete(`/wishlist/${id}`)
  return response.data
}

export const removeFromWishlist = async (id) => {
  return removeWishlistById(id)
}

export const removeWishlistByUserAndProduct = async (payloadOrUserId, productIdArg) => {
  const userId =
    typeof payloadOrUserId === 'object'
      ? payloadOrUserId.user_id
      : payloadOrUserId

  const productId =
    typeof payloadOrUserId === 'object'
      ? payloadOrUserId.product_id
      : productIdArg

  const response = await api.delete(
    `/wishlist/user/${userId}/product/${productId}`,
  )

  return response.data
}
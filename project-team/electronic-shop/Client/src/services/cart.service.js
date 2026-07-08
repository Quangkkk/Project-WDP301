import api from './api'

export const getCart = async (identity) => {
  const response = await api.get('/cart', { params: identity })
  return response.data
}

export const addItemToCart = async (payload) => {
  const response = await api.post('/cart/item', payload)
  return response.data
}

export const updateCartItem = async (itemId, payload) => {
  const response = await api.put(`/cart/item/${itemId}`, payload)
  return response.data
}

export const deleteCartItem = async (itemId) => {
  const response = await api.delete(`/cart/item/${itemId}`)
  return response.data
}

export const clearCart = async (identity) => {
  const response = await api.delete('/cart/clear', { data: identity })
  return response.data
}

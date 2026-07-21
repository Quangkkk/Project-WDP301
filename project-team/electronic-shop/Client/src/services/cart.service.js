import api from './api'

const cleanIdentity = (identity = {}) => {
  const params = {}

  if (identity.user_id) {
    params.user_id = identity.user_id
  }

  if (identity.session_id) {
    params.session_id = identity.session_id
  }

  return params
}

export const getCart = async (identity) => {
  const response = await api.get('/cart', {
    params: cleanIdentity(identity),
  })

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

export const deleteCartItem = async (itemId, identity) => {
  const response = await api.delete(`/cart/item/${itemId}`, {
    params: cleanIdentity(identity),
  })

  return response.data
}

export const clearCart = async (identity) => {
  const response = await api.delete('/cart/clear', {
    data: cleanIdentity(identity),
  })

  return response.data
}

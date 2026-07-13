import api from './api'

export const getUsers = async (params = {}) => {
  const response = await api.get('/user', { params })
  return response.data
}

export const getUserById = async (id) => {
  const response = await api.get(`/user/id/${id}`)
  return response.data
}

export const createUser = async (payload) => {
  const response = await api.post('/user', payload)
  return response.data
}

export const updateUser = async (id, payload) => {
  const response = await api.put(`/user/${id}`, payload)
  return response.data
}

export const deleteUser = async (id) => {
  const response = await api.delete(`/user/id/${id}`)
  return response.data
}

export const createAddress = async (userId, payload) => {
  const response = await api.post(`/user/${userId}/address`, payload)
  return response.data
}

export const updateAddress = async (addressId, payload) => {
  const response = await api.put(`/user/address/${addressId}`, payload)
  return response.data
}

export const deleteAddress = async (addressId) => {
  const response = await api.delete(`/user/address/${addressId}`)
  return response.data
}

import api from './api'

export const getProducts = async (params = {}) => {
  const response = await api.get('/product', { params })
  return response.data
}

export const getProductById = async (id) => {
  const response = await api.get(`/product/${id}`)
  return response.data
}

export const createProduct = async (payload) => {
  const response = await api.post('/product', payload)
  return response.data
}

export const updateProduct = async (id, payload) => {
  const response = await api.put(`/product/${id}`, payload)
  return response.data
}

export const deleteProduct = async (id) => {
  const response = await api.delete(`/product/${id}`)
  return response.data
}

export const createVariant = async (productId, payload) => {
  const response = await api.post(`/product/${productId}/variants`, payload)
  return response.data
}

export const getCategories = async (params = { status: 'active' }) => {
  const response = await api.get('/category', { params })
  return response.data
}

export const createCategory = async (payload) => {
  const response = await api.post('/category', payload)
  return response.data
}

export const updateCategory = async (id, payload) => {
  const response = await api.put(`/category/${id}`, payload)
  return response.data
}

export const deleteCategory = async (id) => {
  const response = await api.delete(`/category/${id}`)
  return response.data
}

export const getBrands = async (params = { status: 'active' }) => {
  const response = await api.get('/brand', { params })
  return response.data
}

export const createBrand = async (payload) => {
  const response = await api.post('/brand', payload)
  return response.data
}

export const updateBrand = async (id, payload) => {
  const response = await api.put(`/brand/${id}`, payload)
  return response.data
}

export const deleteBrand = async (id) => {
  const response = await api.delete(`/brand/${id}`)
  return response.data
}

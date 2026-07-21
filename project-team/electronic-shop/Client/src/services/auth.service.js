import api from './api'

export const login = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const register = async ({ name, email, password, phone, gender, dob }) => {
  const response = await api.post('/auth/register', { name, email, password, phone, gender, dob })
  return response.data
}

export const verifyEmail = async ({ email, user_id }) => {
  const response = await api.post('/auth/verify-email', { email, user_id })
  return response.data
}

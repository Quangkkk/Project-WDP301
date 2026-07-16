import api from './api'

export const login = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const register = async ({ name, email, password, phone }) => {
  const response = await api.post('/auth/register', { name, email, password, phone })
  return response.data
}

export const verifyEmail = async ({ email, otp }) => {
  const response = await api.post('/auth/verify-email', { email, otp })
  return response.data
}

export const resendOTP = async ({ email }) => {
  const response = await api.post('/auth/resend-otp', { email })
  return response.data
}

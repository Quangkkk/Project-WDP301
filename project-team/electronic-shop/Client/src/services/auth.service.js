import api from './api'

export const login = async ({ email, password }) => {
  const response = await api.post('/auth/login', { email, password })
  return response.data
}

export const register = async ({ name, email, password, phone }) => {
  const response = await api.post('/auth/register', {
    name,
    email,
    password,
    phone,
  })

  return response.data
}

export const forgotPassword = async ({ email }) => {
  const response = await api.post('/auth/forgot-password', { email })
  return response.data
}

export const resetPassword = async ({ token, password, confirmPassword }) => {
  const response = await api.post(`/auth/reset-password/${token}`, {
    password,
    confirmPassword,
    confirm_password: confirmPassword,
  })

  return response.data
}

export const verifyEmail = async ({ email, user_id }) => {
  const response = await api.post('/auth/verify-email', { email, user_id })
  return response.data
}

export const resendVerificationCode = async ({ email }) => {
  const response = await api.post('/auth/resend-verification-code', { email })
  return response.data
}
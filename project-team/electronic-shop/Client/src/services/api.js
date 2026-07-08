import axios from 'axios'
import { getAccessToken } from '../utils/authStorage'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
}

export default api

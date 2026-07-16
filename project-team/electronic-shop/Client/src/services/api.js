import axios from 'axios'
import { getAccessToken } from '../utils/authStorage'

// Lay API Base URL tu file cau hinh .env hoac mac dinh port 8080
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

// Khoi tao instance Axios voi cau hinh mac dinh
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Axios request interceptor: tu dong lay token tu localStorage/sessionStorage
// va gan vao header Authorization (Bearer token) cho cac request can xac thuc
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
}

export default api

import api from './api'

export const getRevenueAnalytics = async (params = {}) => {
  const response = await api.get('/analytics/revenue', { params })
  return response.data
}

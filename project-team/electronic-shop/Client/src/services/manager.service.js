import api from './api'

// GET /manager/staff — Danh sach nhan vien STAFF (chi MANAGER va ADMIN)
export const getStaffList = async () => {
  const response = await api.get('/manager/staff')
  return response.data
}

// POST /manager/staff — Tao tai khoan Staff moi
export const createStaff = async (payload) => {
  const response = await api.post('/manager/staff', payload)
  return response.data
}

// PATCH /manager/staff/:id/status — Khoa / mo khoa tai khoan Staff
export const toggleStaffStatus = async (staffId, status) => {
  const response = await api.patch(`/manager/staff/${staffId}/status`, { status })
  return response.data
}

// GET /manager/staff/:id/performance — Hieu suat xu ly don hang cua mot Staff
export const getStaffPerformance = async (staffId) => {
  const response = await api.get(`/manager/staff/${staffId}/performance`)
  return response.data
}

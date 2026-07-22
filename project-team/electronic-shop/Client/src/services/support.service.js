import api from './api'

export const getTickets = async (params = {}) => {
  const response = await api.get('/support/tickets', { params })
  return response.data
}

export const getTicketById = async (id) => {
  const response = await api.get(`/support/tickets/${id}`)
  return response.data
}

export const createTicket = async (payload) => {
  const response = await api.post('/support/tickets', payload)
  return response.data
}

export const updateTicket = async (id, payload) => {
  const response = await api.put(`/support/tickets/${id}`, payload)
  return response.data
}

export const deleteTicket = async (id) => {
  const response = await api.delete(`/support/tickets/${id}`)
  return response.data
}

export const createTicketMessage = async (ticketId, payload) => {
  const response = await api.post(`/support/tickets/${ticketId}/messages`, payload)
  return response.data
}

export const createTicketFromChat = async (chatId, payload) => {
  const response = await api.post(`/support/admin/tickets/from-chat/${chatId}`, payload)
  return response.data
}

export const uploadSupportFiles = async (files = []) => {
  const formData = new FormData()

  for (const file of files) {
    formData.append('files', file)
  }

  const response = await api.post('/support/tickets/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
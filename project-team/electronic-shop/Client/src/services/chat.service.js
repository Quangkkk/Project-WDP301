import api from './api'

export const openConversation = async (payload) => {
  const response = await api.post('/chat/conversations/open', payload)
  return response.data
}

export const createConversation = async (payload) => {
  const response = await api.post('/chat/conversations', payload)
  return response.data
}

export const getConversations = async (params = {}) => {
  const response = await api.get('/chat/conversations', { params })
  return response.data
}

export const getConversationById = async (id) => {
  const response = await api.get(`/chat/conversations/${id}`)
  return response.data
}

export const updateConversation = async (id, payload) => {
  const response = await api.put(`/chat/conversations/${id}`, payload)
  return response.data
}

export const sendChatMessage = async (conversationId, payload) => {
  const response = await api.post(
    `/chat/conversations/${conversationId}/messages`,
    payload,
  )

  return response.data
}

export const markConversationAsRead = async (conversationId, payload) => {
  const response = await api.patch(
    `/chat/conversations/${conversationId}/read`,
    payload,
  )

  return response.data
}

export const uploadChatFiles = async (files = []) => {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('files', file)
  })

  const response = await api.post('/chat/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
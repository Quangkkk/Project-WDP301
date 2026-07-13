import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'

import MainLayout from '../../components/templates/MainLayout'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'

import { API_BASE_URL, getErrorMessage } from '../../services/api'
import {
  getConversationById,
  markConversationAsRead,
  openConversation,
  sendChatMessage,
} from '../../services/chat.service'
import { getCurrentUser, getUserId } from '../../utils/authStorage'
import { getId } from '../../utils/format'

function formatDateTime(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

function getSenderName(message) {
  const sender = message?.sender_id

  if (!sender || typeof sender === 'string') {
    return 'Người dùng'
  }

  return sender.name || sender.email || 'Người dùng'
}

function getSenderAvatar(message) {
  const sender = message?.sender_id

  if (!sender || typeof sender === 'string') return ''

  return sender.img_url || sender.avatar || sender.avatar_url || ''
}

function getMessageKey(message) {
  return getId(message) || `${message?.sender_id}-${message?.created_at}-${message?.message}`
}

function mergeMessages(currentMessages, nextMessage) {
  if (!nextMessage) return currentMessages

  const map = new Map()

  for (const item of currentMessages) {
    map.set(getMessageKey(item), item)
  }

  map.set(getMessageKey(nextMessage), nextMessage)

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a?.created_at || 0).getTime()
    const timeB = new Date(b?.created_at || 0).getTime()

    return timeA - timeB
  })
}

function ChatNotice({ type = 'info', children }) {
  if (!children) return null

  const className =
    type === 'danger'
      ? 'border-red-100 bg-red-50 text-red-600'
      : 'border-emerald-100 bg-emerald-50 text-emerald-700'

  return (
    <div className={`mb-3 rounded-4 border px-4 py-3 text-sm font-semibold ${className}`}>
      {children}
    </div>
  )
}

function ChatPage() {
  const user = getCurrentUser()
  const currentUserId = getUserId(user)
  const location = useLocation()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const autoSendRef = useRef(false)

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const conversationId = getId(conversation)
  const isClosed = conversation?.status === 'closed'
  const prefillMessage = location.state?.prefillMessage || ''
  const shouldAutoSendMessage = Boolean(
    location.state?.autoSendMessage && prefillMessage,
  )

  const loadConversation = async (targetConversationId = conversationId) => {
    if (!targetConversationId) return

    try {
      const response = await getConversationById(targetConversationId)
      const data = response?.data || {}

      setConversation(data.conversation || null)
      setMessages(Array.isArray(data.messages) ? data.messages : [])

      await markConversationAsRead(targetConversationId, {
        user_id: currentUserId,
      })
    } catch (error) {
      setError(getErrorMessage(error, 'Không tải được cuộc trò chuyện.'))
    }
  }

  const sendSocketMessage = async (targetConversationId, text) => {
    const socket = socketRef.current

    if (!socket || !socket.connected) {
      throw new Error('SOCKET_NOT_CONNECTED')
    }

    return new Promise((resolve, reject) => {
      socket.timeout(8000).emit(
        'chat:sendMessage',
        {
          conversation_id: targetConversationId,
          sender_id: currentUserId,
          message: text,
        },
        (timeoutError, response) => {
          if (timeoutError) {
            reject(new Error('Không gửi được tin nhắn qua socket.'))
            return
          }

          if (!response?.success) {
            reject(new Error(response?.message || 'Không gửi được tin nhắn.'))
            return
          }

          resolve(response)
        },
      )
    })
  }

  const sendMessageRealtime = async (targetConversationId, text) => {
    try {
      const response = await sendSocketMessage(targetConversationId, text)

      setMessages((prev) => mergeMessages(prev, response?.data))
      return response
    } catch {
      const response = await sendChatMessage(targetConversationId, {
        sender_id: currentUserId,
        message: text,
      })

      setMessages((prev) => mergeMessages(prev, response?.data))
      return response
    }
  }

  const sendInitialProductMessage = async (targetConversationId) => {
    if (!targetConversationId || !shouldAutoSendMessage || autoSendRef.current) {
      return false
    }

    autoSendRef.current = true

    await sendMessageRealtime(targetConversationId, prefillMessage)

    navigate('/chat', {
      replace: true,
      state: {},
    })

    return true
  }

  const initConversation = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError('')
      setMessage('')

      const response = await openConversation({
        customer_id: currentUserId,
      })

      const openedConversation = response?.data || null
      setConversation(openedConversation)

      if (openedConversation) {
        const targetConversationId = getId(openedConversation)

        await loadConversation(targetConversationId)

        const didAutoSend = await sendInitialProductMessage(targetConversationId)

        if (didAutoSend) {
          setMessage('Đã gửi thông tin sản phẩm vào chat.')
        }
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Không mở được cuộc trò chuyện.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    initConversation()
  }, [])

  useEffect(() => {
    if (!conversationId || !currentUserId) return undefined

    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        user_id: currentUserId,
      },
    })

    socketRef.current = socket

    const joinConversation = () => {
      setIsSocketConnected(true)
      socket.emit('chat:join', conversationId)
    }

    const handleDisconnect = () => {
      setIsSocketConnected(false)
    }

    const handleNewMessage = (payload = {}) => {
      if (String(payload.conversationId) !== String(conversationId)) return

      if (payload.conversation) {
        setConversation(payload.conversation)
      }

      setMessages((prev) => mergeMessages(prev, payload.message))

      markConversationAsRead(conversationId, {
        user_id: currentUserId,
      }).catch(() => {})
    }

    const handleConversationUpdated = (payload = {}) => {
      if (String(payload.conversationId) !== String(conversationId)) return

      if (payload.conversation) {
        setConversation(payload.conversation)
      }
    }

    socket.on('connect', joinConversation)
    socket.on('disconnect', handleDisconnect)
    socket.on('chat:newMessage', handleNewMessage)
    socket.on('chat:conversationUpdated', handleConversationUpdated)

    return () => {
      socket.emit('chat:leave', conversationId)
      socket.off('connect', joinConversation)
      socket.off('disconnect', handleDisconnect)
      socket.off('chat:newMessage', handleNewMessage)
      socket.off('chat:conversationUpdated', handleConversationUpdated)
      socket.disconnect()
      socketRef.current = null
      setIsSocketConnected(false)
    }
  }, [conversationId, currentUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages])

  const handleSendMessage = async (event) => {
    event.preventDefault()

    if (!conversationId) {
      setError('Không tìm thấy cuộc trò chuyện.')
      return
    }

    if (!newMessage.trim()) {
      setError('Vui lòng nhập nội dung tin nhắn.')
      return
    }

    try {
      setIsSending(true)
      setError('')
      setMessage('')

      await sendMessageRealtime(conversationId, newMessage.trim())

      setNewMessage('')
    } catch (error) {
      setError(getErrorMessage(error, 'Không gửi được tin nhắn.'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <MainLayout>
      <section className='page-section'>
        <Container>
          <div className='mb-4'>
            <p className='mb-1 text-xs font-black uppercase tracking-[0.25em] text-orange-600'>
              Chat
            </p>

            <h1 className='mb-0 text-3xl font-black text-slate-950'>
              Nhắn tin hỗ trợ
            </h1>
          </div>

          <ChatNotice type='danger'>{error}</ChatNotice>
          <ChatNotice>{message}</ChatNotice>

          {isLoading ? (
            <LoadingText />
          ) : !user ? (
            <EmptyState
              icon='🔐'
              title='Bạn cần đăng nhập'
              description='Vui lòng đăng nhập để nhắn tin với hỗ trợ.'
              actionLabel='Đăng nhập'
              onAction={() => window.location.assign('/login')}
            />
          ) : (
            <Card
              className='card-surface overflow-hidden'
              style={{
                minHeight: 650,
              }}
            >
              <div className='border-bottom bg-white p-4'>
                <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                  <div>
                    <h2 className='mb-1 text-2xl font-semibold text-slate-950'>
                      Hỗ trợ trực tuyến
                    </h2>

                    <p className='mb-0 text-sm text-slate-500'>
                      Tin nhắn được cập nhật realtime bằng Socket.IO.
                    </p>
                  </div>

                  <span
                    className={`rounded-pill px-3 py-2 text-xs font-bold ${
                      isClosed
                        ? 'bg-slate-100 text-slate-600'
                        : isSocketConnected
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {isClosed
                      ? 'Đã đóng'
                      : isSocketConnected
                        ? 'Đang mở · Online'
                        : 'Đang mở · Kết nối lại'}
                  </span>
                </div>
              </div>

              <div
                className='bg-slate-50 p-4'
                style={{
                  height: 440,
                  overflowY: 'auto',
                }}
              >
                {messages.length === 0 ? (
                  <EmptyState
                    icon='💬'
                    title='Chưa có tin nhắn'
                    description='Bạn có thể gửi tin nhắn đầu tiên cho bộ phận hỗ trợ.'
                  />
                ) : (
                  <div className='d-flex flex-column gap-3'>
                    {messages.map((item) => {
                      const senderId = getId(item.sender_id)
                      const isMine = senderId === currentUserId
                      const avatar = getSenderAvatar(item)

                      return (
                        <div
                          key={getMessageKey(item)}
                          className={`d-flex gap-2 ${
                            isMine ? 'justify-content-end' : 'justify-content-start'
                          }`}
                        >
                          {!isMine && (
                            <div
                              className='d-flex align-items-center justify-content-center overflow-hidden rounded-circle bg-white text-sm font-bold text-orange-600 shadow-sm'
                              style={{
                                width: 36,
                                height: 36,
                                minWidth: 36,
                              }}
                            >
                              {avatar ? (
                                <img
                                  src={avatar}
                                  alt={getSenderName(item)}
                                  className='h-100 w-100 object-fit-cover'
                                />
                              ) : (
                                getSenderName(item).charAt(0).toUpperCase()
                              )}
                            </div>
                          )}

                          <div
                            className={`rounded-4 px-3 py-2 shadow-sm ${
                              isMine
                                ? 'bg-orange-500 text-white'
                                : 'bg-white text-slate-800'
                            }`}
                            style={{
                              maxWidth: '74%',
                            }}
                          >
                            <p
                              className={`mb-1 text-xs ${
                                isMine ? 'text-orange-100' : 'text-slate-400'
                              }`}
                            >
                              {isMine ? 'Bạn' : getSenderName(item)} ·{' '}
                              {formatDateTime(item.created_at)}
                            </p>

                            <p className='mb-0 whitespace-pre-line text-sm'>
                              {item.message}
                            </p>
                          </div>
                        </div>
                      )
                    })}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className='border-top bg-white p-3'>
                {isClosed ? (
                  <div className='rounded-4 bg-slate-100 px-3 py-3 text-center text-sm font-bold text-slate-500'>
                    Cuộc trò chuyện đã đóng, không thể gửi thêm tin nhắn.
                  </div>
                ) : (
                  <Form onSubmit={handleSendMessage}>
                    <div className='d-flex align-items-end gap-2'>
                      <Form.Control
                        as='textarea'
                        rows={2}
                        value={newMessage}
                        onChange={(event) => {
                          setNewMessage(event.target.value)
                          setError('')
                          setMessage('')
                        }}
                        placeholder='Nhập tin nhắn...'
                        className='rounded-4 border-slate-200 text-sm shadow-sm'
                        style={{
                          resize: 'none',
                        }}
                      />

                      <Button
                        type='submit'
                        isLoading={isSending}
                        className='px-4'
                      >
                        Gửi
                      </Button>
                    </div>
                  </Form>
                )}
              </div>
            </Card>
          )}
        </Container>
      </section>
    </MainLayout>
  )
}

export default ChatPage
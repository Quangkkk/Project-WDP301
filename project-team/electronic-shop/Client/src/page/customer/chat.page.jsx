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
  uploadChatFiles,
} from '../../services/chat.service'
import { getAccessToken, getCurrentUser, getUserId } from '../../utils/authStorage'
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

function formatFileSize(size) {
  const numberSize = Number(size || 0)

  if (numberSize < 1024) return `${numberSize} B`
  if (numberSize < 1024 * 1024) return `${(numberSize / 1024).toFixed(1)} KB`

  return `${(numberSize / 1024 / 1024).toFixed(1)} MB`
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
  return (
    getId(message) ||
    `${message?.sender_id}-${message?.created_at}-${message?.message}`
  )
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
    <div
      className={`mb-3 !rounded-4 border px-4 py-3 text-sm font-semibold ${className}`}
    >
      {children}
    </div>
  )
}

function MessageAttachments({ attachments = [], isMine }) {
  if (!attachments.length) return null

  return (
    <div className='mt-2 d-flex flex-column gap-2'>
      {attachments.map((item, index) => {
        const isImage =
          item.type === 'image' ||
          String(item.mime_type || '').startsWith('image/')

        if (isImage) {
          return (
            <a
              key={`${item.url}-${index}`}
              href={item.url}
              target='_blank'
              rel='noreferrer'
              className='d-block overflow-hidden !rounded-3 border bg-white'
              style={{
                width: 190,
                maxWidth: '100%',
              }}
            >
              <img
                src={item.url}
                alt={item.original_name || 'Ảnh chat'}
                className='w-100 object-fit-cover'
                style={{
                  maxHeight: 190,
                }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </a>
          )
        }

        return (
          <a
            key={`${item.url}-${index}`}
            href={item.url}
            target='_blank'
            rel='noreferrer'
            className={`d-flex align-items-center gap-2 !rounded-3 border px-3 py-2 text-decoration-none ${
              isMine
                ? 'border-white bg-white text-slate-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <i className='bi bi-paperclip' />

            <span className='text-sm'>
              {item.original_name || 'File đính kèm'}

              <small className='ms-2 opacity-75'>
                {formatFileSize(item.size)}
              </small>
            </span>
          </a>
        )
      })}
    </div>
  )
}

function ChatPage() {
  const user = getCurrentUser()
  const currentUserId = getUserId(user)
  const token = getAccessToken()
  const location = useLocation()
  const navigate = useNavigate()

  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const autoSendRef = useRef(false)
  const fileInputRef = useRef(null)

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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

  const sendSocketMessage = async (
    targetConversationId,
    text,
    attachments = [],
  ) => {
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
          attachments,
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

  const sendMessageRealtime = async (
    targetConversationId,
    text,
    attachments = [],
  ) => {
    try {
      const response = await sendSocketMessage(
        targetConversationId,
        text,
        attachments,
      )

      setMessages((prev) => mergeMessages(prev, response?.data))

      return response
    } catch {
      const response = await sendChatMessage(targetConversationId, {
        sender_id: currentUserId,
        message: text,
        attachments,
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
      auth: { token },
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
  }, [conversationId, currentUserId, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages])

  const handleSelectFiles = (event) => {
    const files = Array.from(event.target.files || [])

    if (!files.length) return

    const validFiles = files.slice(0, 5)

    setSelectedFiles((prev) => [...prev, ...validFiles].slice(0, 5))

    event.target.value = ''
    setError('')
    setMessage('')
  }

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()

    if (!conversationId) {
      setError('Không tìm thấy cuộc trò chuyện.')
      return
    }

    if (!newMessage.trim() && selectedFiles.length === 0) {
      setError('Vui lòng nhập tin nhắn hoặc chọn file.')
      return
    }

    try {
      setIsSending(true)
      setIsUploading(selectedFiles.length > 0)
      setError('')
      setMessage('')

      let uploadedAttachments = []

      if (selectedFiles.length > 0) {
        const uploadResponse = await uploadChatFiles(selectedFiles)
        uploadedAttachments = uploadResponse?.data || []
      }

      await sendMessageRealtime(
        conversationId,
        newMessage.trim(),
        uploadedAttachments,
      )

      setNewMessage('')
      setSelectedFiles([])
    } catch (error) {
      setError(getErrorMessage(error, 'Không gửi được tin nhắn.'))
    } finally {
      setIsSending(false)
      setIsUploading(false)
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
                      Bạn có thể gửi tin nhắn, ảnh hoặc file cho bộ phận hỗ trợ.
                    </p>
                  </div>

                  <span
                    className={`!rounded-pill px-3 py-2 text-xs font-bold ${
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
                              className='d-flex align-items-center justify-content-center overflow-hidden !rounded-circle bg-white text-sm font-bold text-orange-600 shadow-sm'
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
                            className={`!rounded-4 px-3 py-2 shadow-sm ${
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

                            {item.message && (
                              <p className='mb-0 whitespace-pre-line text-sm'>
                                {item.message}
                              </p>
                            )}

                            <MessageAttachments
                              attachments={item.attachments || []}
                              isMine={isMine}
                            />
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
                  <div className='!rounded-4 bg-slate-100 px-3 py-3 text-center text-sm font-bold text-slate-500'>
                    Cuộc trò chuyện đã đóng, không thể gửi thêm tin nhắn.
                  </div>
                ) : (
                  <Form onSubmit={handleSendMessage}>
                    {selectedFiles.length > 0 && (
                      <div className='mb-2 d-flex flex-wrap gap-2'>
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className='d-flex align-items-center gap-2 !rounded-pill border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700'
                          >
                            <i
                              className={
                                file.type.startsWith('image/')
                                  ? 'bi bi-image'
                                  : 'bi bi-paperclip'
                              }
                            />

                            <span>{file.name}</span>

                            <button
                              type='button'
                              onClick={() => handleRemoveFile(index)}
                              className='border-0 bg-transparent p-0 text-red-500'
                              title='Bỏ file'
                            >
                              <i className='bi bi-x-lg' />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type='file'
                      multiple
                      accept='image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip'
                      onChange={handleSelectFiles}
                      className='d-none'
                    />

                    <div className='d-flex align-items-end gap-2'>
                      <button
                        type='button'
                        onClick={() => fileInputRef.current?.click()}
                        className='d-flex align-items-center justify-content-center !rounded-circle border border-slate-200 bg-white text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
                        style={{
                          width: 46,
                          height: 46,
                          minWidth: 46,
                        }}
                        title='Đính kèm ảnh/file'
                      >
                        <i className='bi bi-paperclip fs-5' />
                      </button>

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
                        className='!rounded-4 border-slate-200 text-sm shadow-sm'
                        style={{
                          resize: 'none',
                        }}
                      />

                      <Button
                        type='submit'
                        isLoading={isSending || isUploading}
                        className='px-4'
                      >
                        {isUploading ? 'Đang tải' : 'Gửi'}
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
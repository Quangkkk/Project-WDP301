import { useEffect, useRef, useState } from 'react'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'

import MainLayout from '../../components/templates/MainLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'

import { getErrorMessage } from '../../services/api'
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

function ChatPage() {
  const user = getCurrentUser()
  const currentUserId = getUserId(user)
  const messagesEndRef = useRef(null)

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const conversationId = getId(conversation)
  const isClosed = conversation?.status === 'closed'

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
        await loadConversation(getId(openedConversation))
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
    if (!conversationId || isClosed) return undefined

    const intervalId = window.setInterval(() => {
      loadConversation(conversationId)
    }, 4000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [conversationId, isClosed])

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

      await sendChatMessage(conversationId, {
        sender_id: currentUserId,
        message: newMessage.trim(),
      })

      setNewMessage('')
      await loadConversation(conversationId)
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

          <Alert type='danger'>{error}</Alert>
          <Alert type='success'>{message}</Alert>

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
                      Gửi câu hỏi nhanh cho đội hỗ trợ. Tin nhắn sẽ tự làm mới sau vài giây.
                    </p>
                  </div>

                  <span
                    className={`rounded-pill px-3 py-2 text-xs font-bold ${
                      isClosed
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isClosed ? 'Đã đóng' : 'Đang mở'}
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
                          key={getId(item)}
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
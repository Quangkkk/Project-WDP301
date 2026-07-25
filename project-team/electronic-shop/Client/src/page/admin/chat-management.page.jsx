import { useEffect, useRef, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import { io } from 'socket.io-client'
import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import LoadingText from '../../components/atoms/LoadingText'
import api, { API_BASE_URL, getErrorMessage } from '../../services/api'
import { getAccessToken, getCurrentUser } from '../../utils/authStorage'
import { formatDate, getId } from '../../utils/format'
import { useLocation } from 'react-router-dom'
import { uploadChatFiles } from '../../services/chat.service'
import { createTicketFromChat } from '../../services/support.service'
import MessageAttachments from '../../components/molecules/MessageAttachments'

// ---- Toast notification trong app ----
let toastIdCounter = 0

function InAppToast({ toasts, onRemove }) {
  if (!toasts.length) return null

  return (
    <>
      <style>{`
        @keyframes chatMgrToastIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes chatMgrBadgePulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
          }

          50% {
            transform: scale(1.15);
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => onRemove(toast.id)}
            style={{
              pointerEvents: 'auto',
              background:
                'linear-gradient(135deg,#1e40af 0%,#2563eb 100%)',
              color: '#fff',
              borderRadius: 14,
              padding: '12px 18px 12px 14px',
              boxShadow: '0 8px 32px rgba(37,99,235,0.35)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              minWidth: 300,
              maxWidth: 400,
              cursor: 'pointer',
              animation:
                'chatMgrToastIn 0.35s cubic-bezier(.21,1.02,.73,1) both',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              💬
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 3,
                }}
              >
                Tin nhắn mới từ {toast.customerName || 'Khách hàng'}
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.88,
                  wordBreak: 'break-word',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {toast.text}
              </div>
            </div>

            <span
              style={{
                opacity: 0.7,
                fontSize: 18,
                alignSelf: 'flex-start',
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              ×
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

// Tạo âm thanh thông báo
function playNotifSound() {
  try {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )()

    const play = (frequency, start, duration) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.connect(gain)
      gain.connect(audioContext.destination)

      oscillator.type = 'sine'

      oscillator.frequency.setValueAtTime(
        frequency,
        audioContext.currentTime + start,
      )

      gain.gain.setValueAtTime(
        0,
        audioContext.currentTime + start,
      )

      gain.gain.linearRampToValueAtTime(
        0.12,
        audioContext.currentTime + start + 0.01,
      )

      gain.gain.linearRampToValueAtTime(
        0,
        audioContext.currentTime + start + duration,
      )

      oscillator.start(audioContext.currentTime + start)
      oscillator.stop(audioContext.currentTime + start + duration)
    }

    play(660, 0, 0.1)
    play(880, 0.12, 0.1)
    play(1100, 0.24, 0.15)
  } catch (error) {
    // Trình duyệt có thể chặn âm thanh nếu người dùng chưa tương tác.
  }
}

function getCustomerAvatar(customer) {
  return (
    customer?.img_url ||
    customer?.avatar_url ||
    customer?.avatar ||
    ''
  )
}

function resolveAvatarUrl(value) {
  if (!value) return ''

  const avatarUrl = String(value).trim()

  if (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('data:') ||
    avatarUrl.startsWith('blob:')
  ) {
    return avatarUrl
  }

  if (avatarUrl.startsWith('/')) {
    return `${API_BASE_URL}${avatarUrl}`
  }

  return `${API_BASE_URL}/${avatarUrl}`
}

function CustomerAvatar({
  customer,
  size = 42,
  showOnline = false,
  selected = false,
}) {
  const [imageError, setImageError] = useState(false)

  const rawAvatarUrl = getCustomerAvatar(customer)
  const avatarUrl = resolveAvatarUrl(rawAvatarUrl)

  const customerName =
    customer?.name ||
    customer?.email ||
    'Khách hàng'

  const firstCharacter =
    customerName.trim().charAt(0).toUpperCase() || 'K'

  useEffect(() => {
    setImageError(false)
  }, [avatarUrl])

  return (
    <div
      className='relative shrink-0'
      style={{
        width: size,
        height: size,
      }}
    >
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={`Avatar của ${customerName}`}
          onError={() => setImageError(true)}
          className={`
            h-full w-full rounded-full border object-cover
            ${
              selected
                ? 'border-white/70'
                : 'border-slate-200'
            }
          `}
        />
      ) : (
        <div
          className={`
            flex h-full w-full items-center justify-center
            rounded-full border font-black
            ${
              selected
                ? 'border-white/70 bg-white/20 text-white'
                : 'border-orange-100 bg-orange-100 text-orange-600'
            }
          `}
        >
          {firstCharacter}
        </div>
      )}

      {showOnline && (
        <span
          className={`
            absolute bottom-0 right-0 block
            h-3 w-3 rounded-full bg-green-500
            ring-2 ring-white
          `}
        />
      )}
    </div>
  )
}

function ChatManagementPage() {
  const [toasts, setToasts] = useState([])

  const addToast = (text, customerName) => {
    const id = ++toastIdCounter

    setToasts((previous) => [
      ...previous,
      {
        id,
        text,
        customerName,
      },
    ])

    setTimeout(() => {
      setToasts((previous) =>
        previous.filter((toast) => toast.id !== id),
      )
    }, 6000)
  }

  const removeToast = (id) => {
    setToasts((previous) =>
      previous.filter((toast) => toast.id !== id),
    )
  }

  const user = getCurrentUser()
  const token = getAccessToken()

  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isCustomerTyping, setIsCustomerTyping] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadCounts, setUnreadCounts] = useState({})
  const [globalSocket, setGlobalSocket] = useState(null)

  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [error, setError] = useState('')
  const [chatError, setChatError] = useState('')
  const [isConverting, setIsConverting] = useState(false)

  const fileInputRef = useRef(null)
  const socketRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const location = useLocation()

  // Chọn conversation từ Notification.
  useEffect(() => {
    if (
      location.state?.conversationId &&
      conversations.length > 0
    ) {
      const conversationId = location.state.conversationId

      const conversation = conversations.find(
        (item) =>
          String(getId(item)) === String(conversationId),
      )

      if (
        conversation &&
        (
          !selectedConv ||
          String(getId(selectedConv)) !==
            String(conversationId)
        )
      ) {
        setSelectedConv(conversation)
      }
    }
  }, [
    location.state,
    conversations,
    selectedConv,
  ])

  // Chỉ cuộn bên trong khung tin nhắn, không kéo toàn bộ trang xuống.
  useEffect(() => {
    const container = messagesContainerRef.current

    if (!container) return undefined

    const animationFrame = requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'auto',
      })
    })

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [messages, selectedConv])

  // Tải danh sách hội thoại của Staff.
  const loadConversations = async () => {
    try {
      setIsLoadingList(true)
      setError('')

      const response = await api.get('/chat/conversations')
      setConversations(response.data?.data || [])
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không tải được danh sách hội thoại.',
        ),
      )
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    loadConversations()

    if (
      'Notification' in window &&
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission()
    }

    const socket = io(API_BASE_URL, {
      auth: {
        token,
      },
    })

    socket.on('connect', () => {
      socket.emit('chat:joinStaffRoom')
    })

    setGlobalSocket(socket)
    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  // Lắng nghe tin nhắn mới trên toàn cục.
  useEffect(() => {
    if (!globalSocket) return undefined

    const handleStaffReceiveMessage = ({
      conversationId,
      message,
    }) => {
      const myId =
        user?._id ||
        user?.id ||
        user?.user_id

      const senderId =
        message.sender_id?._id ||
        message.sender_id

      if (String(senderId) === String(myId)) {
        return
      }

      let customerName = 'Khách hàng'

      setConversations((previous) => {
        const conversationIndex = previous.findIndex(
          (conversation) =>
            String(getId(conversation)) ===
            String(conversationId),
        )

        if (conversationIndex < 0) {
          return previous
        }

        const next = [...previous]
        const [conversation] = next.splice(
          conversationIndex,
          1,
        )

        const updatedConversation = {
          ...conversation,
          updated_at: new Date().toISOString(),
        }

        customerName =
          conversation.customer_id?.name ||
          conversation.customer_id?.email ||
          'Khách hàng'

        return [
          updatedConversation,
          ...next,
        ]
      })

      const isCurrentConversation =
        selectedConv &&
        String(getId(selectedConv)) ===
          String(conversationId)

      if (!isCurrentConversation) {
        setUnreadCounts((previous) => ({
          ...previous,
          [conversationId]:
            (previous[conversationId] || 0) + 1,
        }))

        addToast(
          message.message ||
            'Đã gửi một tệp đính kèm',
          customerName,
        )

        playNotifSound()

        if (
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(
            `Tin nhắn mới từ ${customerName}`,
            {
              body:
                message.message ||
                'Đã gửi một tệp đính kèm',
              icon: '/vite.svg',
              tag: `chat-${conversationId}`,
            },
          )
        }
      }
    }

    globalSocket.on(
      'staff_receive_message',
      handleStaffReceiveMessage,
    )

    return () => {
      globalSocket.off(
        'staff_receive_message',
        handleStaffReceiveMessage,
      )
    }
  }, [
    globalSocket,
    selectedConv,
    user,
  ])

  // Kết nối socket và lấy tin nhắn khi chọn hội thoại.
  useEffect(() => {
    if (!selectedConv) return undefined

    const selectedConversationId = getId(selectedConv)

    setUnreadCounts((previous) => ({
      ...previous,
      [selectedConversationId]: 0,
    }))

    let active = true

    const connectChat = async () => {
      try {
        setIsLoadingChat(true)
        setChatError('')
        setMessages([])
        setIsCustomerTyping(false)

        const response = await api.get(
          `/chat/conversations/${selectedConversationId}/messages`,
        )

        if (!active) return

        setMessages(
          response.data?.data?.messages || [],
        )

        if (globalSocket) {
          globalSocket.emit(
            'join_conversation',
            {
              conversation_id:
                selectedConversationId,
            },
          )
        }
      } catch (loadError) {
        if (active) {
          setChatError(
            getErrorMessage(
              loadError,
              'Không thể kết nối phòng chat.',
            ),
          )
        }
      } finally {
        if (active) {
          setIsLoadingChat(false)
        }
      }
    }

    const handleReceiveMessage = (receivedMessage) => {
      setMessages((previous) => {
        const alreadyExists = previous.some(
          (message) =>
            String(message._id) ===
            String(receivedMessage._id),
        )

        if (alreadyExists) {
          return previous
        }

        return [
          ...previous,
          receivedMessage,
        ]
      })
    }

    const handleCustomerTyping = ({
      is_typing: isTyping,
    }) => {
      setIsCustomerTyping(isTyping)
    }

    connectChat()

    if (globalSocket) {
      globalSocket.on(
        'receive_message',
        handleReceiveMessage,
      )

      globalSocket.on(
        'customer_typing',
        handleCustomerTyping,
      )
    }

    return () => {
      active = false

      if (globalSocket) {
        globalSocket.off(
          'receive_message',
          handleReceiveMessage,
        )

        globalSocket.off(
          'customer_typing',
          handleCustomerTyping,
        )
      }
    }
  }, [
    selectedConv,
    globalSocket,
  ])

  const handleSelectFiles = (event) => {
    const files = Array.from(
      event.target.files || [],
    )

    if (!files.length) return

    const validFiles = files.slice(0, 5)

    setSelectedFiles((previous) =>
      [
        ...previous,
        ...validFiles,
      ].slice(0, 5),
    )

    event.target.value = ''
  }

  const handleRemoveFile = (index) => {
    setSelectedFiles((previous) =>
      previous.filter(
        (_, fileIndex) =>
          fileIndex !== index,
      ),
    )
  }

  // Gửi tin nhắn.
  const handleSend = async (event) => {
    event.preventDefault()

    if (
      (
        !inputText.trim() &&
        selectedFiles.length === 0
      ) ||
      !selectedConv ||
      !socketRef.current
    ) {
      return
    }

    let uploadedAttachments = []

    try {
      if (selectedFiles.length > 0) {
        setIsUploading(true)

        const uploadResponse =
          await uploadChatFiles(selectedFiles)

        uploadedAttachments =
          uploadResponse?.data || []
      }

      socketRef.current.emit(
        'send_message',
        {
          conversation_id: getId(selectedConv),
          message: inputText.trim(),
          attachments: uploadedAttachments,
        },
      )

      socketRef.current.emit(
        'staff_typing',
        {
          conversation_id: getId(selectedConv),
          is_typing: false,
        },
      )

      setInputText('')
      setSelectedFiles([])
    } catch (sendError) {
      setChatError(
        getErrorMessage(
          sendError,
          'Không gửi được tin nhắn/file.',
        ),
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleConvertToTicket = async () => {
    if (!selectedConv) return

    const isConfirmed = window.confirm(
      'Bạn có chắc muốn chuyển cuộc hội thoại này thành Support Ticket không? Cuộc hội thoại sẽ được đóng.',
    )

    if (!isConfirmed) return

    try {
      setIsConverting(true)

      await createTicketFromChat(
        getId(selectedConv),
        {
          subject: 'Hỗ trợ từ Chat',
          category: 'general',
        },
      )

      window.alert(
        'Đã chuyển thành Ticket thành công!',
      )

      setSelectedConv(null)
      await loadConversations()
    } catch (convertError) {
      window.alert(
        getErrorMessage(
          convertError,
          'Lỗi khi chuyển ticket',
        ),
      )
    } finally {
      setIsConverting(false)
    }
  }

  // Emit trạng thái đang gõ.
  const handleInputChange = (event) => {
    const value = event.target.value

    setInputText(value)

    if (
      socketRef.current &&
      selectedConv
    ) {
      socketRef.current.emit(
        'staff_typing',
        {
          conversation_id: getId(selectedConv),
          is_typing: value.length > 0,
        },
      )
    }
  }

  const normalizedSearchQuery =
    searchQuery.trim().toLowerCase()

  const filteredConversations =
    conversations.filter((conversation) => {
      if (!normalizedSearchQuery) {
        return true
      }

      const customerName =
        conversation.customer_id?.name ||
        ''

      const customerEmail =
        conversation.customer_id?.email ||
        ''

      return (
        customerName
          .toLowerCase()
          .includes(normalizedSearchQuery) ||
        customerEmail
          .toLowerCase()
          .includes(normalizedSearchQuery)
      )
    })

  return (
    <DashboardLayout>
      <InAppToast
        toasts={toasts}
        onRemove={removeToast}
      />

      <Alert type='danger'>
        {error}
      </Alert>

      <Row
        className='g-4 mb-4'
        style={{
          height: 'calc(100dvh - 220px)',
          minHeight: 520,
          maxHeight: 760,
        }}
      >
        {/* Cột danh sách hội thoại bên trái */}
        <Col
          lg={4}
          className='h-100'
        >
          <Card
            className='card-surface h-100 overflow-hidden'
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Card.Header className='border-bottom border-slate-100 bg-white p-3'>
              <Form.Control
                type='text'
                placeholder='Tìm khách hàng...'
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                className='!rounded-pill px-4 text-sm shadow-none'
              />
            </Card.Header>

            <div
              className='d-flex flex-1 flex-column gap-1 overflow-y-auto bg-slate-50 p-2'
              style={{
                minHeight: 0,
              }}
            >
              {isLoadingList ? (
                <LoadingText />
              ) : filteredConversations.length === 0 ? (
                <div className='py-5 text-center text-sm text-slate-400'>
                  {conversations.length === 0
                    ? 'Chưa có cuộc hội thoại nào được phân công.'
                    : 'Không tìm thấy khách hàng phù hợp.'}
                </div>
              ) : (
                filteredConversations.map(
                  (conversation) => {
                    const conversationId =
                      getId(conversation)

                    const isSelected =
                      selectedConv &&
                      String(
                        getId(selectedConv),
                      ) ===
                        String(conversationId)

                    const unreadCount =
                      unreadCounts[
                        conversationId
                      ] || 0

                    return (
                      <div
                        key={conversationId}
                        onClick={() =>
                          setSelectedConv(
                            conversation,
                          )
                        }
                        className={`
                          cursor-pointer rounded-4 p-3
                          transition
                          ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : `
                                border border-slate-100
                                bg-white
                                hover:bg-slate-100
                              `
                          }
                        `}
                      >
                        <div className='d-flex align-items-start gap-3'>
                          <CustomerAvatar
                            customer={
                              conversation.customer_id
                            }
                            size={42}
                            selected={isSelected}
                          />

                          <div className='min-w-0 flex-grow-1'>
                            <div className='mb-1 d-flex align-items-start justify-content-between gap-2'>
                              <h5
                                className={`
                                  m-0 min-w-0 text-truncate
                                  text-sm font-black
                                  ${
                                    isSelected
                                      ? 'text-white'
                                      : 'text-slate-900'
                                  }
                                `}
                              >
                                {conversation
                                  .customer_id
                                  ?.name ||
                                  'Khách hàng'}
                              </h5>

                              <span
                                className={`
                                  shrink-0 text-[9px]
                                  ${
                                    isSelected
                                      ? 'text-blue-100'
                                      : 'text-slate-400'
                                  }
                                `}
                              >
                                {formatDate(
                                  conversation
                                    .updated_at ||
                                    conversation
                                      .created_at,
                                )}
                              </span>
                            </div>

                            <p
                              className={`
                                m-0 text-truncate text-xs
                                ${
                                  isSelected
                                    ? 'text-blue-100'
                                    : 'text-slate-500'
                                }
                              `}
                            >
                              {conversation
                                .customer_id
                                ?.email ||
                                'Không có email'}
                            </p>

                            {unreadCount > 0 && (
                              <div className='mt-2 d-flex justify-content-end'>
                                <span
                                  className={`
                                    !rounded-pill bg-red-500
                                    px-2 py-0.5 text-[10px]
                                    font-bold text-white shadow-sm
                                  `}
                                >
                                  {unreadCount} tin mới
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  },
                )
              )}
            </div>
          </Card>
        </Col>

        {/* Cột khung chat bên phải */}
        <Col
          lg={8}
          className='h-100'
        >
          <Card
            className='card-surface h-100 overflow-hidden'
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {selectedConv ? (
              <>
                <Card.Header className='d-flex align-items-center justify-content-between border-bottom border-slate-100 bg-white py-3'>
                  <div className='d-flex align-items-center gap-3'>
                    <CustomerAvatar
                      customer={
                        selectedConv.customer_id
                      }
                      size={46}
                      showOnline
                    />

                    <div className='min-w-0'>
                      <h4 className='m-0 text-sm font-black text-slate-900'>
                        {selectedConv
                          .customer_id
                          ?.name ||
                          'Khách hàng'}
                      </h4>

                      <p className='mb-0 mt-1 text-xs text-slate-500'>
                        {selectedConv
                          .customer_id
                          ?.email ||
                          ''}
                      </p>
                    </div>
                  </div>
                </Card.Header>

                <div
                  ref={messagesContainerRef}
                  className='d-flex flex-1 flex-column gap-3 overflow-y-auto bg-slate-50 p-4 pb-5'
                  style={{
                    minHeight: 0,
                    overscrollBehavior: 'contain',
                  }}
                >
                  {chatError && (
                    <Alert type='danger'>
                      {chatError}
                    </Alert>
                  )}

                  {isLoadingChat ? (
                    <LoadingText />
                  ) : messages.length === 0 ? (
                    <div className='py-5 text-center text-sm text-slate-400'>
                      Chưa có tin nhắn nào trong phòng này.
                    </div>
                  ) : (
                    messages.map(
                      (
                        chatMessage,
                        index,
                      ) => {
                        const myId =
                          user?._id ||
                          user?.id ||
                          user?.user_id

                        const senderId =
                          chatMessage
                            .sender_id
                            ?._id ||
                          chatMessage
                            .sender_id

                        const isMe =
                          String(senderId) ===
                          String(myId)

                        return (
                          <div
                            key={
                              chatMessage._id ||
                              index
                            }
                            className={`
                              d-flex flex-column
                              ${
                                isMe
                                  ? `
                                    align-items-end
                                    items-end
                                  `
                                  : `
                                    align-items-start
                                    items-start
                                  `
                              }
                            `}
                          >
                            <div
                              className={`
                                max-w-[75%] rounded-4
                                px-3 py-2 text-sm
                                ${
                                  isMe
                                    ? `
                                      rounded-br-none
                                      bg-orange-500
                                      text-white
                                    `
                                    : `
                                      !rounded-bl-none
                                      border
                                      border-slate-200
                                      bg-white
                                      text-slate-800
                                    `
                                }
                              `}
                              style={{
                                boxShadow:
                                  '0 1px 2px rgba(0,0,0,0.05)',
                                wordBreak: 'break-word',
                              }}
                            >
                              {chatMessage.message}

                              <MessageAttachments
                                attachments={
                                  chatMessage
                                    .attachments ||
                                  []
                                }
                                isMine={isMe}
                              />
                            </div>

                            <div
                              className={`
                                mt-1 d-flex
                                align-items-center
                                gap-1 px-1
                                text-[9px]
                                text-slate-400
                                ${
                                  isMe
                                    ? 'flex-row-reverse'
                                    : ''
                                }
                              `}
                            >
                              <span>
                                {chatMessage
                                  .sender_id
                                  ?.name ||
                                  (
                                    isMe
                                      ? 'Bạn'
                                      : 'Khách hàng'
                                  )}
                              </span>

                              <span>•</span>

                              <span>
                                {new Date(
                                  chatMessage
                                    .created_at ||
                                    Date.now(),
                                ).toLocaleTimeString(
                                  'vi-VN',
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      },
                    )
                  )}

                  {isCustomerTyping && (
                    <div className='d-flex align-items-start'>
                      <div className='!rounded-bl-none rounded-4 bg-slate-200 px-3 py-2 text-xs italic text-slate-600'>
                        Khách hàng đang gõ phím...
                      </div>
                    </div>
                  )}

                </div>

                <Card.Footer className='border-top border-slate-100 bg-white p-3'>
                  <form onSubmit={handleSend}>
                    {selectedFiles.length > 0 && (
                      <div className='mb-2 d-flex flex-wrap gap-2'>
                        {selectedFiles.map(
                          (
                            file,
                            index,
                          ) => (
                            <div
                              key={`${file.name}-${index}`}
                              className='d-flex align-items-center gap-2 rounded-pill border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700'
                            >
                              <i
                                className={
                                  file.type.startsWith(
                                    'image/',
                                  )
                                    ? 'bi bi-image'
                                    : 'bi bi-paperclip'
                                }
                              />

                              <span>
                                {file.name}
                              </span>

                              <button
                                type='button'
                                onClick={() =>
                                  handleRemoveFile(
                                    index,
                                  )
                                }
                                className='border-0 bg-transparent p-0 text-red-500'
                                title='Bỏ file'
                              >
                                <i className='bi bi-x-lg' />
                              </button>
                            </div>
                          ),
                        )}
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

                    <div className='d-flex align-items-center gap-2'>
                      <button
                        type='button'
                        onClick={() =>
                          fileInputRef
                            .current
                            ?.click()
                        }
                        className='d-flex align-items-center justify-content-center rounded-circle border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600'
                        style={{
                          width: 40,
                          height: 40,
                          minWidth: 40,
                        }}
                        title='Đính kèm ảnh/file'
                      >
                        <i className='bi bi-paperclip fs-5' />
                      </button>

                      <Form.Control
                        type='text'
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder='Nhập nội dung hỗ trợ khách hàng...'
                        className='!rounded-pill px-4 shadow-none'
                        disabled={
                          isLoadingChat ||
                          isUploading
                        }
                      />

                      <Button
                        type='submit'
                        disabled={
                          isLoadingChat ||
                          isUploading ||
                          (
                            !inputText.trim() &&
                            selectedFiles.length === 0
                          )
                        }
                      >
                        {isUploading
                          ? 'Đang gửi...'
                          : 'Gửi'}
                      </Button>
                    </div>
                  </form>
                </Card.Footer>
              </>
            ) : (
              <div className='d-flex h-100 flex-column items-center justify-content-center bg-slate-50 p-5 text-slate-400'>
                <span className='mb-3 text-5xl'>
                  💬
                </span>

                <h4 className='mb-1 text-lg font-black text-slate-800'>
                  Hộp thoại Hỗ Trợ Khách Hàng
                </h4>

                <p className='max-w-sm text-center text-sm'>
                  Chọn một cuộc trò chuyện từ danh sách bên trái
                  để bắt đầu nhắn tin trực tuyến.
                </p>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </DashboardLayout>
  )
}

export default ChatManagementPage
import { useEffect, useMemo, useRef, useState } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Badge from 'react-bootstrap/Badge'

import DashboardLayout from '../../components/templates/DashboardLayout'
import Alert from '../../components/atoms/Alert'
import Button from '../../components/atoms/Button'
import EmptyState from '../../components/atoms/EmptyState'
import LoadingText from '../../components/atoms/LoadingText'

import { getErrorMessage, API_BASE_URL } from '../../services/api'
import {
  createTicketMessage,
  getTicketById,
  getTickets,
  updateTicket,
  uploadSupportFiles,
} from '../../services/support.service'
import {
  getAccessToken,
  getCurrentUser,
  getUserId,
  getUserRole,
} from '../../utils/authStorage'
import { io } from 'socket.io-client'
import { useLocation } from 'react-router-dom'
import { formatDate, getId, pickArray } from '../../utils/format'
import MessageAttachments from '../../components/molecules/MessageAttachments'

// ---- Toast notification ----
let spToastIdCounter = 0

function SupportToast({ toasts, onRemove }) {
  if (!toasts.length) return null

  return (
    <>
      <style>{`
        @keyframes spToastSlide {
          from {
            opacity: 0;
            transform: translateY(-18px) scale(0.95);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes spBadgePop {
          0%,
          100% {
            transform: scale(1);
          }

          40% {
            transform: scale(1.3);
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
                toast.type === 'new_ticket'
                  ? 'linear-gradient(135deg,#7c3aed 0%,#9333ea 100%)'
                  : 'linear-gradient(135deg,#0f766e 0%,#0d9488 100%)',
              color: '#fff',
              borderRadius: 14,
              padding: '12px 18px 12px 14px',
              boxShadow:
                toast.type === 'new_ticket'
                  ? '0 8px 32px rgba(124,58,237,0.35)'
                  : '0 8px 32px rgba(13,148,136,0.35)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              minWidth: 300,
              maxWidth: 420,
              cursor: 'pointer',
              animation:
                'spToastSlide 0.35s cubic-bezier(.21,1.02,.73,1) both',
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
              {toast.type === 'new_ticket' ? '🎫' : '💬'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 3,
                }}
              >
                {toast.title}
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.88,
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

function playSpSound(type = 'message') {
  try {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )()

    const play = (frequency, start, duration) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.connect(gain)
      gain.connect(audioContext.destination)

      oscillator.type = type === 'new_ticket' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(
        frequency,
        audioContext.currentTime + start,
      )

      gain.gain.setValueAtTime(0, audioContext.currentTime + start)
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

    if (type === 'new_ticket') {
      play(440, 0, 0.12)
      play(550, 0.14, 0.12)
      play(660, 0.28, 0.15)
      play(880, 0.44, 0.2)
    } else {
      play(660, 0, 0.1)
      play(880, 0.13, 0.13)
    }
  } catch (error) {
    // Trình duyệt có thể chặn âm thanh nếu người dùng chưa tương tác.
  }
}

const ticketTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'open', label: 'Đang mở' },
  { key: 'in_progress', label: 'Đang xử lý' },
  { key: 'closed', label: 'Đã đóng' },
]

function getTicketStatusLabel(status) {
  const map = {
    open: 'Đang mở',
    in_progress: 'Đang xử lý',
    pending: 'Đang xử lý',
    closed: 'Đã đóng',
  }

  return map[status] || status || 'Không xác định'
}

function getStatusClass(status) {
  const map = {
    open: 'bg-emerald-50 text-emerald-700',
    in_progress: 'bg-orange-50 text-orange-700',
    pending: 'bg-orange-50 text-orange-700',
    closed: 'bg-slate-100 text-slate-600',
  }

  return map[status] || 'bg-slate-100 text-slate-600'
}

function StatusPill({ status }) {
  return (
    <span
      className={`
        inline-flex items-center whitespace-nowrap
        !rounded-pill px-2 py-1 text-xs font-bold
        ${getStatusClass(status)}
      `}
    >
      {getTicketStatusLabel(status)}
    </span>
  )
}

function getCategoryLabel(category) {
  if (!category) return ''

  const map = {
    general: 'Chung',
    warranty: 'Bảo hành',
    technical: 'Kỹ thuật',
    shipping: 'Vận chuyển',
    billing: 'Thanh toán',
    refund: 'Hoàn tiền',
  }

  return map[category.toLowerCase()] || category
}

function formatDateTime(value) {
  if (!value) return '--'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

  if (!sender || typeof sender === 'string') {
    return ''
  }

  return sender.img_url || sender.avatar || sender.avatar_url || ''
}

function getTicketActivityTime(ticket) {
  return new Date(
    ticket?.last_message_at ||
      ticket?.created_at ||
      ticket?.updated_at ||
      0,
  ).getTime()
}

function sortTicketsByActivity(ticketList = []) {
  return [...ticketList].sort(
    (ticketA, ticketB) =>
      getTicketActivityTime(ticketB) -
      getTicketActivityTime(ticketA),
  )
}

function SupportManagementPage() {
  const user = getCurrentUser()
  const messagesEndRef = useRef(null)
  const location = useLocation()

  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [newMessage, setNewMessage] = useState('')

  const [selectedFiles, setSelectedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Notification state
  const [toasts, setToasts] = useState([])
  const [unreadTickets, setUnreadTickets] = useState({})

  const selectedTicketRef = useRef(null)
  const loadTicketsRef = useRef(null)

  const currentUserId = getUserId(user)
  const currentUserRole = getUserRole(user)

  const selectedAssignedStaffId = getId(
    selectedTicket?.assigned_staff_id,
  )

  const isSelectedUnassigned = !selectedAssignedStaffId

  const isSelectedAssignedToMe =
    Boolean(selectedAssignedStaffId) &&
    String(selectedAssignedStaffId) === String(currentUserId)

  const canHandleSelectedTicket =
    currentUserRole !== 'STAFF' || isSelectedAssignedToMe

  useEffect(() => {
    selectedTicketRef.current = selectedTicket
  }, [selectedTicket])

  const addToast = (title, text, type = 'message') => {
    const id = ++spToastIdCounter

    setToasts((previous) => [
      ...previous,
      {
        id,
        title,
        text,
        type,
      },
    ])

    setTimeout(() => {
      setToasts((previous) =>
        previous.filter((toast) => toast.id !== id),
      )
    }, 7000)
  }

  const removeToast = (id) => {
    setToasts((previous) =>
      previous.filter((toast) => toast.id !== id),
    )
  }

  const filteredTickets = useMemo(() => {
    let result = [...tickets]

    if (activeTab !== 'all') {
      result = result.filter((ticket) => {
        if (activeTab === 'in_progress') {
          return (
            ticket.status === 'in_progress' ||
            ticket.status === 'pending'
          )
        }

        return ticket.status === activeTab
      })
    }

    return sortTicketsByActivity(result)
  }, [tickets, activeTab])

  const loadTicketDetail = async (ticketId) => {
    if (!ticketId) return

    try {
      setIsDetailLoading(true)
      setError('')

      const response = await getTicketById(ticketId)
      const data = response?.data || {}

      setSelectedTicket(data.ticket || null)
      setMessages(
        Array.isArray(data.messages) ? data.messages : [],
      )
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không tải được chi tiết ticket.',
        ),
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  const loadTickets = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await getTickets()
      const data = pickArray(response, [])

      setTickets(sortTicketsByActivity(data))

      if (data.length > 0) {
        const ticketIdFromState = location.state?.ticketId
        const currentSelectedId = getId(
          selectedTicketRef.current,
        )

        if (
          ticketIdFromState &&
          data.some(
            (ticket) =>
              String(getId(ticket)) ===
              String(ticketIdFromState),
          )
        ) {
          await loadTicketDetail(ticketIdFromState)
        } else if (
          currentSelectedId &&
          data.some(
            (ticket) =>
              String(getId(ticket)) ===
              String(currentSelectedId),
          )
        ) {
          await loadTicketDetail(currentSelectedId)
        } else {
          await loadTicketDetail(getId(data[0]))
        }
      } else {
        setSelectedTicket(null)
        setMessages([])
      }
    } catch (loadError) {
      setError(
        getErrorMessage(
          loadError,
          'Không tải được danh sách ticket.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTicketsRef.current = loadTickets
  })

  useEffect(() => {
    if (location.state?.ticketId && tickets.length > 0) {
      const ticketId = location.state.ticketId

      if (
        !selectedTicket ||
        String(getId(selectedTicket)) !== String(ticketId)
      ) {
        const ticket = tickets.find(
          (item) =>
            String(getId(item)) === String(ticketId),
        )

        if (ticket) {
          loadTicketDetail(ticketId)
        }
      }
    }
  }, [location.state, tickets])

  useEffect(() => {
    const token = getAccessToken()

    if (!token) return undefined

    if (
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission()
    }

    const socket = io(API_BASE_URL, {
      auth: {
        token,
      },
    })

    const canCurrentUserSeeTicket = (ticket) => {
      if (!ticket) return false
      if (currentUserRole !== 'STAFF') return true

      const assignedStaffId = getId(
        ticket.assigned_staff_id,
      )

      return (
        !assignedStaffId ||
        String(assignedStaffId) ===
          String(currentUserId)
      )
    }

    const removeTicketFromScreen = (ticketId) => {
      setTickets((previous) =>
        previous.filter(
          (ticket) =>
            String(getId(ticket)) !== String(ticketId),
        ),
      )

      setUnreadTickets((previous) => {
        const next = { ...previous }
        delete next[ticketId]
        return next
      })

      if (
        selectedTicketRef.current &&
        String(getId(selectedTicketRef.current)) ===
          String(ticketId)
      ) {
        setSelectedTicket(null)
        setMessages([])
      }
    }

    const upsertTicket = (ticket) => {
      if (!ticket) return

      const ticketId = getId(ticket)

      if (!canCurrentUserSeeTicket(ticket)) {
        removeTicketFromScreen(ticketId)
        return
      }

      setTickets((previous) => {
        const next = previous.filter(
          (item) =>
            String(getId(item)) !== String(ticketId),
        )

        return sortTicketsByActivity([ticket, ...next])
      })

      if (
        selectedTicketRef.current &&
        String(getId(selectedTicketRef.current)) ===
          String(ticketId)
      ) {
        setSelectedTicket(ticket)
      }
    }

    const handleReconnect = () => {
      loadTicketsRef.current?.()
    }

    socket.on('connect', () => {
      socket.emit('chat:joinStaffRoom')
    })

    socket.io.on('reconnect', handleReconnect)

    socket.on(
      'support_ticket_created',
      ({ ticket }) => {
        if (!canCurrentUserSeeTicket(ticket)) return

        const ticketId = getId(ticket)

        upsertTicket(ticket)

        setUnreadTickets((previous) => ({
          ...previous,
          [ticketId]: Math.max(
            previous[ticketId] || 0,
            1,
          ),
        }))

        const notificationTitle =
          'Ticket hỗ trợ mới'

        const notificationBody = `${
          ticket.user_id?.name || 'Khách hàng'
        }: ${ticket.subject || 'Yêu cầu mới'}`

        addToast(
          notificationTitle,
          notificationBody,
          'new_ticket',
        )

        playSpSound('new_ticket')

        if (
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(notificationTitle, {
            body: notificationBody,
            icon: '/vite.svg',
            tag: `ticket-created-${ticketId}`,
          })
        }
      },
    )

    socket.on(
      'staff_receive_ticket_message',
      ({
        ticketId,
        message: receivedMessage,
        ticket,
      }) => {
        if (ticket) {
          upsertTicket(ticket)
        }

        const isSelected =
          selectedTicketRef.current &&
          String(getId(selectedTicketRef.current)) ===
            String(ticketId)

        if (isSelected) {
          setMessages((previous) => {
            const exists = previous.some(
              (item) =>
                String(getId(item)) ===
                String(getId(receivedMessage)),
            )

            return exists
              ? previous
              : [...previous, receivedMessage]
          })

          return
        }

        setUnreadTickets((previous) => ({
          ...previous,
          [ticketId]: (previous[ticketId] || 0) + 1,
        }))

        playSpSound('message')

        addToast(
          `Ticket #${String(ticketId)
            .slice(-6)
            .toUpperCase()}`,
          receivedMessage?.message ||
            'Khách hàng vừa gửi tệp đính kèm.',
        )
      },
    )

    socket.on(
      'support_ticket_assigned',
      ({
        ticketId,
        assignedStaffId,
        ticket,
      }) => {
        if (
          currentUserRole === 'STAFF' &&
          String(assignedStaffId) !==
            String(currentUserId)
        ) {
          removeTicketFromScreen(ticketId)
          return
        }

        if (ticket) {
          upsertTicket(ticket)
        }
      },
    )

    socket.on(
      'support_ticket_updated',
      ({ ticket }) => {
        upsertTicket(ticket)
      },
    )

    socket.on(
      'support_ticket_deleted',
      ({ ticketId }) => {
        removeTicketFromScreen(ticketId)
      },
    )

    return () => {
      socket.io.off('reconnect', handleReconnect)
      socket.disconnect()
    }
  }, [currentUserId, currentUserRole])

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, selectedTicket])

  const handleSendMessage = async (event) => {
    event.preventDefault()

    if (!selectedTicket) return

    if (!canHandleSelectedTicket) {
      setError(
        'Bạn cần nhận ticket này trước khi gửi phản hồi.',
      )
      return
    }

    if (
      !newMessage.trim() &&
      selectedFiles.length === 0
    ) {
      setError(
        'Vui lòng nhập nội dung tin nhắn hoặc đính kèm file.',
      )
      return
    }

    try {
      setIsSending(true)
      setIsUploading(selectedFiles.length > 0)
      setError('')
      setMessage('')

      let uploadedAttachments = []

      if (selectedFiles.length > 0) {
        const uploadResponse =
          await uploadSupportFiles(selectedFiles)

        uploadedAttachments = uploadResponse?.data || []
      }

      const ticketId = getId(selectedTicket)

      const response = await createTicketMessage(ticketId, {
        sender_id: currentUserId,
        message: newMessage.trim(),
        attachments: uploadedAttachments,
      })

      const sentMessage = response?.data
      const updatedTicket = response?.ticket

      if (sentMessage) {
        setMessages((previous) => {
          const exists = previous.some(
            (item) =>
              String(getId(item)) ===
              String(getId(sentMessage)),
          )

          return exists
            ? previous
            : [...previous, sentMessage]
        })
      }

      if (updatedTicket) {
        setSelectedTicket(updatedTicket)

        setTickets((previous) => {
          const next = previous.filter(
            (ticket) =>
              String(getId(ticket)) !==
              String(ticketId),
          )

          return sortTicketsByActivity([
            updatedTicket,
            ...next,
          ])
        })
      }

      setNewMessage('')
      setSelectedFiles([])
    } catch (sendError) {
      setError(
        getErrorMessage(
          sendError,
          'Không gửi được tin nhắn.',
        ),
      )
    } finally {
      setIsSending(false)
      setIsUploading(false)
    }
  }

  const handleClaimTicket = async () => {
    if (!selectedTicket || !currentUserId) return

    const isConfirmed = window.confirm(
      'Bạn có chắc chắn muốn nhận xử lý ticket này không?',
    )

    if (!isConfirmed) return

    try {
      setIsUpdating(true)
      setError('')
      setMessage('')

      const response = await updateTicket(
        getId(selectedTicket),
        {
          assigned_staff_id: currentUserId,
        },
      )

      const updatedTicket = response?.data

      if (updatedTicket) {
        setSelectedTicket(updatedTicket)

        setTickets((previous) => {
          const ticketId = getId(updatedTicket)
          const next = previous.filter(
            (ticket) =>
              String(getId(ticket)) !==
              String(ticketId),
          )

          return sortTicketsByActivity([
            updatedTicket,
            ...next,
          ])
        })
      }

      setMessage('Bạn đã nhận xử lý ticket này.')
    } catch (claimError) {
      setError(
        getErrorMessage(
          claimError,
          'Không nhận được ticket. Ticket có thể đã được nhân viên khác nhận.',
        ),
      )

    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!selectedTicket) return

    try {
      setIsUpdating(true)
      setError('')
      setMessage('')

      const response = await updateTicket(
        getId(selectedTicket),
        {
          status,
        },
      )

      const updatedTicket = response?.data

      if (updatedTicket) {
        setSelectedTicket(updatedTicket)

        setTickets((previous) => {
          const ticketId = getId(updatedTicket)
          const next = previous.filter(
            (ticket) =>
              String(getId(ticket)) !==
              String(ticketId),
          )

          return sortTicketsByActivity([
            updatedTicket,
            ...next,
          ])
        })
      }

      setMessage('Đã cập nhật trạng thái ticket.')
    } catch (updateError) {
      setError(
        getErrorMessage(
          updateError,
          'Không cập nhật được ticket.',
        ),
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSelectFiles = (event) => {
    const files = Array.from(event.target.files || [])

    if (!files.length) return

    setSelectedFiles((previous) =>
      [...previous, ...files].slice(0, 5),
    )

    event.target.value = ''
  }

  return (
    <DashboardLayout
      title='Quản lý yêu cầu hỗ trợ'
      description='Xử lý ticket từ khách hàng.'
    >
      <SupportToast
        toasts={toasts}
        onRemove={removeToast}
      />

      <Alert type='danger'>{error}</Alert>
      <Alert type='success'>{message}</Alert>

      {isLoading ? (
        <LoadingText />
      ) : (
        <Row
          className='g-4'
          style={{
            height: 'calc(100vh - 280px)',
            minHeight: 650,
          }}
        >
          <Col lg={4} className='h-100'>
            <Card className='card-surface h-100 overflow-hidden d-flex flex-column'>
              <div className='border-bottom bg-white p-3'>
                <Form.Group className='mb-2'>
                  <Form.Label className='text-xs font-bold'>
                    Trạng thái
                  </Form.Label>

                  <Form.Select
                    size='sm'
                    value={activeTab}
                    onChange={(event) =>
                      setActiveTab(event.target.value)
                    }
                  >
                    {ticketTabs.map((tab) => (
                      <option
                        key={tab.key}
                        value={tab.key}
                      >
                        {tab.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>

              <div className='flex-1 overflow-auto bg-slate-50'>
                {filteredTickets.length === 0 ? (
                  <div className='p-4 text-center text-sm text-slate-500'>
                    Không có ticket nào
                  </div>
                ) : (
                  filteredTickets.map((ticket) => {
                    const ticketId = getId(ticket)
                    const isActive =
                      String(getId(selectedTicket)) ===
                      String(ticketId)

                    const hasUnread =
                      unreadTickets[ticketId] > 0

                    return (
                      <div
                        key={ticketId}
                        onClick={() => {
                          loadTicketDetail(ticketId)

                          setUnreadTickets((previous) => ({
                            ...previous,
                            [ticketId]: 0,
                          }))
                        }}
                        className={`
                          cursor-pointer border-bottom p-3
                          transition
                          ${
                            isActive
                              ? 'bg-blue-50'
                              : 'bg-white hover:bg-slate-50'
                          }
                        `}
                        style={
                          hasUnread
                            ? {
                                borderLeft:
                                  '3px solid #7c3aed',
                              }
                            : {}
                        }
                      >
                        <div className='mb-2 d-flex align-items-center justify-content-between gap-2'>
                          <div className='d-flex min-w-0 align-items-center gap-1'>
                            {ticket.category && (
                              <Badge bg='secondary'>
                                {getCategoryLabel(
                                  ticket.category,
                                )}
                              </Badge>
                            )}

                            {hasUnread && (
                              <span
                                style={{
                                  background: '#7c3aed',
                                  color: '#fff',
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 7px',
                                  lineHeight: '18px',
                                }}
                              >
                                Mới
                              </span>
                            )}
                          </div>

                          <StatusPill status={ticket.status} />
                        </div>

                        <h6
                          className={`
                            mb-1 text-sm font-bold
                            ${
                              hasUnread
                                ? 'text-purple-700'
                                : 'text-slate-900'
                            }
                          `}
                        >
                          {hasUnread && (
                            <span
                              style={{
                                display: 'inline-block',
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#7c3aed',
                                marginRight: 6,
                                verticalAlign: 'middle',
                                animation:
                                  'spBadgePop 1s ease infinite',
                              }}
                            />
                          )}

                          {ticket.subject}
                        </h6>

                        <div className='mb-1 text-xs text-slate-500'>
                          {ticket.user_id?.name ||
                            ticket.user_id?.email ||
                            'Khách hàng'}
                        </div>

                        <div className='text-[10px] text-slate-400'>
                          Tin nhắn gần nhất:{' '}
                          {formatDate(
                            ticket.last_message_at ||
                              ticket.created_at ||
                              ticket.updated_at,
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </Col>

          <Col lg={8} className='h-100'>
            <Card className='card-surface h-100 overflow-hidden d-flex flex-column'>
              {!selectedTicket ? (
                <Card.Body className='d-flex align-items-center justify-content-center p-5'>
                  <EmptyState
                    icon='🎧'
                    title='Chọn một ticket'
                    description='Chọn ticket ở bên trái để xem nội dung và xử lý.'
                  />
                </Card.Body>
              ) : (
                <>
                  <div className='border-bottom bg-white p-4'>
                    <div className='d-flex align-items-start justify-content-between gap-3'>
                      <div className='min-w-0 flex-grow-1'>
                        <div className='mb-2 d-flex align-items-center justify-content-between gap-2'>
                          <div>
                            {selectedTicket.category && (
                              <Badge bg='secondary'>
                                {getCategoryLabel(
                                  selectedTicket.category,
                                )}
                              </Badge>
                            )}
                          </div>

                          <StatusPill
                            status={selectedTicket.status}
                          />
                        </div>

                        <h4 className='mb-2 font-bold text-slate-900'>
                          {selectedTicket.subject}
                        </h4>

                        <div className='mb-2 text-sm text-slate-500'>
                          Khách:{' '}
                          <b>
                            {selectedTicket.user_id?.name ||
                              selectedTicket.user_id?.email ||
                              'Khách hàng'}
                          </b>
                        </div>

                        <div className='text-sm text-slate-500'>
                          Người phụ trách:{' '}

                          {selectedTicket.assigned_staff_id ? (
                            <b className='text-emerald-700'>
                              {isSelectedAssignedToMe
                                ? 'Bạn'
                                : selectedTicket
                                    .assigned_staff_id
                                    ?.name ||
                                  selectedTicket
                                    .assigned_staff_id
                                    ?.email ||
                                  'Nhân viên'}
                            </b>
                          ) : (
                            <b className='text-amber-600'>
                              Chưa có người nhận
                            </b>
                          )}
                        </div>
                      </div>

                      <div className='d-flex flex-wrap justify-content-end gap-2'>
                        {isSelectedUnassigned &&
                          selectedTicket.status !==
                            'closed' && (
                            <Button
                              size='sm'
                              variant='success'
                              onClick={handleClaimTicket}
                              disabled={isUpdating}
                            >
                              Nhận ticket
                            </Button>
                          )}

                        {canHandleSelectedTicket &&
                          selectedTicket.status ===
                            'closed' && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                handleUpdateStatus('open')
                              }
                              disabled={isUpdating}
                            >
                              Mở lại
                            </Button>
                          )}

                        {canHandleSelectedTicket &&
                          selectedTicket.status !==
                            'closed' && (
                            <Button
                              size='sm'
                              variant='secondary'
                              onClick={() =>
                                handleUpdateStatus('closed')
                              }
                              disabled={isUpdating}
                            >
                              Đóng ticket
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className='flex-1 overflow-auto bg-slate-50 p-4'>
                    {isDetailLoading ? (
                      <LoadingText />
                    ) : messages.length === 0 ? (
                      <EmptyState
                        icon='💬'
                        title='Chưa có tin nhắn'
                      />
                    ) : (
                      <div className='d-flex flex-column gap-3'>
                        {messages.map((item) => {
                          const isMine =
                            String(
                              item.sender_id?._id ||
                                item.sender_id,
                            ) === String(currentUserId)

                          const avatar =
                            getSenderAvatar(item)

                          return (
                            <div
                              key={getId(item)}
                              className={`
                                d-flex gap-2
                                ${
                                  isMine
                                    ? 'justify-content-end'
                                    : 'justify-content-start'
                                }
                              `}
                            >
                              {!isMine && (
                                <div
                                  className='d-flex align-items-center justify-content-center rounded-circle bg-white font-bold text-blue-600 shadow-sm'
                                  style={{
                                    width: 32,
                                    height: 32,
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                  }}
                                >
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      className='h-100 w-100 rounded-circle object-cover'
                                      alt='avatar'
                                    />
                                  ) : (
                                    getSenderName(item).charAt(0)
                                  )}
                                </div>
                              )}

                              <div
                                className={`
                                  rounded-4 px-3 py-2 shadow-sm
                                  ${
                                    isMine
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-slate-800'
                                  }
                                `}
                                style={{
                                  maxWidth: '75%',
                                }}
                              >
                                <p
                                  className={`
                                    mb-1 text-[10px]
                                    ${
                                      isMine
                                        ? 'text-blue-100'
                                        : 'text-slate-400'
                                    }
                                  `}
                                >
                                  {isMine
                                    ? 'Bạn'
                                    : getSenderName(item)}
                                  {' · '}
                                  {formatDateTime(
                                    item.created_at,
                                  )}
                                </p>

                                <p className='mb-0 whitespace-pre-line text-sm'>
                                  {item.message}
                                </p>

                                <MessageAttachments
                                  attachments={
                                    item.attachments || []
                                  }
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
                    {!canHandleSelectedTicket &&
                      selectedTicket.status !== 'closed' && (
                        <div className='mb-2 rounded-3 border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700'>
                          Ticket này chưa được nhận. Hãy bấm
                          “Nhận ticket” trước khi gửi phản hồi
                          hoặc đóng ticket.
                        </div>
                      )}

                    <Form onSubmit={handleSendMessage}>
                      {selectedFiles.length > 0 && (
                        <div className='mb-2 d-flex flex-wrap gap-2'>
                          {selectedFiles.map(
                            (file, index) => (
                              <div
                                key={`${file.name}-${index}`}
                                className='badge d-flex align-items-center gap-1 border bg-slate-100 p-2 text-slate-700'
                              >
                                {file.name}

                                <button
                                  type='button'
                                  onClick={() =>
                                    setSelectedFiles(
                                      (previous) =>
                                        previous.filter(
                                          (
                                            _,
                                            fileIndex,
                                          ) =>
                                            fileIndex !==
                                            index,
                                        ),
                                    )
                                  }
                                  className='border-0 bg-transparent p-0 text-danger'
                                  aria-label={`Bỏ file ${file.name}`}
                                >
                                  ×
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
                        className='d-none'
                        onChange={handleSelectFiles}
                      />

                      <div className='d-flex gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() =>
                            fileInputRef.current?.click()
                          }
                          className='px-3'
                          disabled={
                            !canHandleSelectedTicket ||
                            selectedTicket.status ===
                              'closed'
                          }
                        >
                          <i className='bi bi-paperclip' />
                        </Button>

                        <Form.Control
                          type='text'
                          value={newMessage}
                          onChange={(event) =>
                            setNewMessage(
                              event.target.value,
                            )
                          }
                          placeholder='Nhập phản hồi...'
                          disabled={
                            isSending ||
                            isUploading ||
                            !canHandleSelectedTicket ||
                            selectedTicket.status ===
                              'closed'
                          }
                        />

                        <Button
                          type='submit'
                          disabled={
                            isSending ||
                            isUploading ||
                            !canHandleSelectedTicket ||
                            selectedTicket.status ===
                              'closed' ||
                            (!newMessage.trim() &&
                              selectedFiles.length === 0)
                          }
                        >
                          {isUploading
                            ? 'Đang gửi...'
                            : 'Gửi'}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </DashboardLayout>
  )
}

export default SupportManagementPage